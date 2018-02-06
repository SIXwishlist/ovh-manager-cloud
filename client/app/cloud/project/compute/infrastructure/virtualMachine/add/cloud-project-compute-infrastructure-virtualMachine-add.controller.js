class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
    constructor ($scope, $q, $stateParams, $translate,
                 CloudFlavorService, CloudImageService, CloudNavigation, ControllerModalHelper,
                 OvhCloudPriceHelper, OvhApiCloudProjectFlavor, OvhApiCloudProjectImage, OvhApiCloudProjectQuota, OvhApiCloudProjectRegion, OvhApiCloudProjectSnapshot, OvhApiCloudProjectSshKey,
                 RegionService, ServiceHelper) {
        this.$scope = $scope;
        this.$q = $q;
        this.$stateParams = $stateParams;
        this.$translate = $translate;
        this.CloudFlavorService = CloudFlavorService;
        this.CloudImageService = CloudImageService;
        this.CloudNavigation = CloudNavigation;
        this.ControllerModalHelper = ControllerModalHelper;
        this.OvhCloudPriceHelper = OvhCloudPriceHelper;
        this.OvhApiCloudProjectFlavor = OvhApiCloudProjectFlavor;
        this.OvhApiCloudProjectImage = OvhApiCloudProjectImage;
        this.OvhApiCloudProjectQuota = OvhApiCloudProjectQuota;
        this.OvhApiCloudProjectRegion = OvhApiCloudProjectRegion;
        this.OvhApiCloudProjectSnapshot = OvhApiCloudProjectSnapshot;
        this.OvhApiCloudProjectSshKey = OvhApiCloudProjectSshKey;
        this.RegionService = RegionService;
        this.ServiceHelper = ServiceHelper;
    }

    $onInit () {
        this.serviceName = this.$stateParams.projectId;
        this.previousState = this.CloudNavigation.getPreviousState();
        this.loaders = {
            adding: false
        };
        this.model = {
            flavor: null,
            imageId: null,
            imageType: null,
            name: null,
            number: 0,
            region: null,
            sshKey: null
        };
        this.enums = {
            flavorsTypes: [],
            imagesTypes: [],
            zonesTypes: ["public", "dedicated"]
        };
        this.newSshKey = {
            name: null,
            publicKey: null
        };
    }

    initProject () {
        // Get prices in background
        this.promisePrices = this.OvhCloudPriceHelper.getPrices(this.serviceName);

        // Get quota in background
        this.promiseQuota = this.OvhApiCloudProjectQuota.Lexi().query({ serviceName: this.serviceName }).$promise;
    }

    cancel () {
        this.previousState.go();
    }

    confirm () {
        this.addVirtualMachine();
    }

    /*
        Step 1 : OS or SnapShot choice
     */
    initOsList () {
        _.set(this.loaders, "step1", true);
        return this.$q.all({
            images: this.OvhApiCloudProjectImage.Lexi().query({ serviceName: this.serviceName }).$promise.catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_images_error")),
            snapshots: this.OvhApiCloudProjectSnapshot.Lexi().query({ serviceName: this.serviceName }).$promise.catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_shapshots_error")),
            sshKeys: this.OvhApiCloudProjectSshKey.Lexi().query({ serviceName: this.serviceName }).$promise
        }).then(({ images, snapshots, sshKeys }) => {
            // Image types (linux, windows, ...)
            this.enums.imagesTypes = _.uniq(_.pluck(images, "type"));
            this.images = _.map(_.uniq(images, "id"), this.CloudImageService.augmentImage);

            this.displayedSnapshots = _.filter(snapshots, { status: "active" });
            this.displayedCustoms = [];
            this.displayedImages = this.CloudImageService.groupImagesByType(this.images, this.enums.imagesTypes);
            this.displayedApps = _.uniq(_.forEach(this.CloudImageService.getApps(this.images), app => {
                delete app.region;
                delete app.id;
            }), "name");

            this.displayedSshKeys = sshKeys;
        }).catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_general_error")).finally(() => {
            this.loaders.step1 = false;
        });
    }

    isStep1Valid () {
        return this.model.imageType && (this.model.imageType.type === "linux" && this.model.sshKey);
    }

    resetStep1 () {
        _.set(this.model, "imageType", null);
        _.set(this.model, "region", null);
        _.set(this.model, "flavor", null);
        _.set(this.model, "sshKey", null);
        this.resetAddingSshKey();
    }

    addSshKey () {
        this.loaders.adding = true;
        return this.OvhApiCloudProjectSshKey.Lexi().save({ serviceName: this.serviceName }, this.newSshKey).$promise
            .then(newSshKey => {
                this.OvhApiCloudProjectSshKey.Lexi().resetQueryCache();
                return this.$q.all({
                    newSshKey,
                    sshKeys: this.OvhApiCloudProjectSshKey.Lexi().query({ serviceName: this.serviceName }).$promise
                });
            })
            .then(({ newSshKey, sshKeys }) => {
                this.displayedSshKeys = sshKeys;
                this.model.sshKey = newSshKey;
                this.checkSshKeyByRegion();
            })
            .catch(this.ServiceHelper.errorHandler("cpcivm_addedit_sshkey_add_submit_error"))
            .finally(() => {
                this.resetAddingSshKey();
                this.loaders.adding = false;
            });
    }

    resetAddingSshKey () {
        _.set(this.newSshKey, "name", null);
        _.set(this.newSshKey, "publicKey", null);
        this.addingSshKey = false;
    }

    checkSshKeyByRegion () {
        _.forEach(this.displayedRegions, region => {
            const found = _.indexOf(this.model.sshKey.regions, region.microRegion.code);
            if (!region.disabled && found === -1) {
                region.disabled = "SSH_KEY";
            } else if (region.disabled === "SSH_KEY" && found > -1) {
                delete region.disabled;
            }
        });
    }

    /*
        Step 2: Region and DataCenter choice
     */
    initRegionsAndDataCenters () {
        _.set(this.loaders, "step2", true);
        return this.$q.all({
            regions: this.OvhApiCloudProjectRegion.Lexi().query({ serviceName: this.serviceName }).$promise
                .then(regions => {
                    this.regions = _.map(regions, region => this.RegionService.getRegion(region));

                    if (this.model.imageType.visibility === "private") { // snapshot
                        this.displayedRegions = _.filter(this.regions, r => this.model.imageType.region === _.get(r, "microRegion.code"));
                    } else {
                        const filteredImages = _.filter(_.cloneDeep(this.images), {
                            distribution: this.model.imageType.distribution,
                            nameGeneric: this.model.imageType.nameGeneric,
                            status: "active"
                        });
                        const filteredRegions = _.uniq(_.map(filteredImages, i => i.region));
                        this.displayedRegions = _.filter(this.regions, r => _.indexOf(filteredRegions, _.get(r, "microRegion.code")) > -1);
                    }
                }),
            quota: this.promiseQuota
                .then(quota => (this.quota = quota))
                .catch(this.ServiceHelper.errorHandler("cpcivm_addedit_quota_error"))
        }).then(() => {
            _.forEach(this.displayedRegions, region => {
                // Add quota info
                this.RegionService.constructor.addOverQuotaInfos(region, this.quota);

                // Check SSH Key opportunity
                this.checkSshKeyByRegion();
            });

            this.groupedRegions = _.groupBy(this.displayedRegions, "continent");
        }).finally(() => {
            this.loaders.step2 = false;
        });
    }

    isStep2Valid () {
        return this.model.region != null;
    }

    resetStep2 () {
        _.set(this.model, "region", null);
        _.set(this.model, "flavor", null);
    }

    updateSshKeyRegion () {
        this.ControllerModalHelper.showConfirmationModal({
            titleText: this.$translate.instant("cpcivm_add_step1_sshKey_regions_title"),
            text: this.$translate.instant("cpcivm_add_step1_sshKey_regions_message", { sshKey: this.model.sshKey })
        })
            .then(() => {
                this.loaders.step2 = true;
                return this.OvhApiCloudProjectSshKey.Lexi().remove({
                    serviceName: this.serviceName,
                    keyId: this.model.sshKey.id
                }).$promise;
            })
            .then(() => this.OvhApiCloudProjectSshKey.Lexi().save({ serviceName: this.serviceName }, {
                name: this.model.sshKey.name,
                publicKey: this.model.sshKey.publicKey
            }).$promise)
            .then(sshKey => {
                this.model.sshKey = sshKey;
                this.checkSshKeyByRegion();
            })
            .finally(() => {
                this.loaders.step2 = false;
            });
    }

    /*
        Step 3: Instance and configuration
     */
    initInstanceAndConfiguration () {
        _.set(this.loaders, "step3", true);
        return this.$q.all({
            flavors: this.OvhApiCloudProjectFlavor.Lexi().query({ serviceName: this.serviceName /* , region: _.get(this.model.region, "microRegion.code", undefined)*/}).$promise
                .then(flavors => {
                    this.flavors = flavors;
                    const filteredFlavors = _.filter(_.map(_.filter(flavors, {
                        available: true,
                        osType: this.model.imageType.type
                    }), flavor => this.CloudFlavorService.augmentFlavor(flavor)), {
                        diskType: "ssd",
                        flex: false
                    });
                    this.enums.flavorsTypes = this.CloudFlavorService.constructor.getFlavorTypes(filteredFlavors);
                    return filteredFlavors;
                }),
            prices: this.promisePrices
                .then(prices => (this.prices = prices))
                .catch(this.ServiceHelper.errorHandler("cpcivm_addedit_flavor_price_error"))
        }).then(({ flavors }) => {
            // Set instance creation number to 1
            this.model.number = 1;

            // Add price and quota info to each instance type
            _.forEach(flavors, flavor => {
                this.CloudFlavorService.constructor.addPriceInfos(flavor, this.prices);
                this.CloudFlavorService.constructor.addOverQuotaInfos(flavor, this.quota);
            });
            // Remove flavor without price (not in the catalog)
            _.remove(flavors, flavor => _.isEmpty(_.get(flavor, "price.price.text", "")));

            this.displayedFlavors = _.uniq(_.remove(flavors, { region: this.model.region.microRegion.code }), "name");

            const usedFlavorNames = _.uniq(_.map(this.displayedFlavors, flavor => flavor.name));
            const notAvailableFlavors = _.filter(flavors, flavor => !_.include(usedFlavorNames, flavor.name));
            const outOfRegionFlavors = _.map(_.uniq(notAvailableFlavors, "name"), flavor => {
                flavor.regions = _.map(_.filter(notAvailableFlavors, f => f.name === flavor.name), "region");
                flavor.disabled = "NOT_AVAILABLE";
                delete flavor.region;
                delete flavor.price;
                return flavor;
            });

            this.displayedFlavors = this.displayedFlavors.concat(outOfRegionFlavors);

            const categorizedFlavors = [];
            _.forEach(this.enums.flavorsTypes, flavorType => {
                const category = this.CloudFlavorService.getCategory(flavorType, true);
                const filteredFlavor = _.filter(this.displayedFlavors, { type: flavorType });
                if (filteredFlavor.length > 0) {
                    categorizedFlavors.push({
                        category: category.id,
                        order: category.order,
                        flavors: _.filter(this.displayedFlavors, { type: flavorType })
                    });
                }
            });
            this.groupedFlavors = _.sortBy(categorizedFlavors, "order");
        }).finally(() => {
            this.loaders.step3 = false;
        });
    }

    isStep3Valid () {
        return this.model.flavor != null && !_.isEmpty(this.model.name) && this.model.number > 0;
    }

    resetStep3 () {
        _.set(this.model, "flavor", null);
    }

    showQuotaMessage (type, params = null) {
        this.ControllerModalHelper.showWarningModal({
            title: this.$translate.instant(`cpcivm_add_step3_disabled_${type}`),
            message: this.$translate.instant(`cpcivm_add_step3_disabled_message_${type}`, params)
        });
    }

    /*
        Step 4: Billing period
     */
    initBillingPeriod () {

    }

    addVirtualMachine () {
        this.loaders.adding = true;
    }
}

angular.module("managerApp").controller("CloudProjectComputeInfrastructureVirtualMachineAddCtrl", CloudProjectComputeInfrastructureVirtualMachineAddCtrl);

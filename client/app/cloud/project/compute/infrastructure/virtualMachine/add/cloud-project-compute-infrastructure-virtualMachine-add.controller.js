class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
    constructor ($scope, $q, $stateParams, $translate,
                 CloudFlavorService, CloudImageService, CloudNavigation, ControllerModalHelper, CurrencyService,
                 OvhCloudPriceHelper, OvhApiCloudProject, OvhApiCloudProjectFlavor, OvhApiCloudProjectImage, OvhApiCloudProjectInstance, OvhApiCloudProjectNetworkPrivate,
                 OvhApiCloudProjectNetworkPublic, OvhApiCloudProjectNetworkPrivateSubnet, OvhApiCloudProjectQuota, OvhApiCloudProjectRegion, OvhApiCloudProjectSnapshot, OvhApiCloudProjectSshKey,
                 RegionService, ServiceHelper, ovhDocUrl) {
        this.$scope = $scope;
        this.$q = $q;
        this.$stateParams = $stateParams;
        this.$translate = $translate;
        this.CloudFlavorService = CloudFlavorService;
        this.CloudImageService = CloudImageService;
        this.CloudNavigation = CloudNavigation;
        this.ControllerModalHelper = ControllerModalHelper;
        this.CurrencyService = CurrencyService;
        this.OvhCloudPriceHelper = OvhCloudPriceHelper;
        this.OvhApiCloudProject = OvhApiCloudProject;
        this.OvhApiCloudProjectFlavor = OvhApiCloudProjectFlavor;
        this.OvhApiCloudProjectImage = OvhApiCloudProjectImage;
        this.OvhApiCloudProjectInstance = OvhApiCloudProjectInstance;
        this.OvhApiCloudProjectNetworkPrivate = OvhApiCloudProjectNetworkPrivate;
        this.OvhApiCloudProjectNetworkPrivateSubnet = OvhApiCloudProjectNetworkPrivateSubnet;
        this.OvhApiCloudProjectNetworkPublic = OvhApiCloudProjectNetworkPublic;
        this.OvhApiCloudProjectQuota = OvhApiCloudProjectQuota;
        this.OvhApiCloudProjectRegion = OvhApiCloudProjectRegion;
        this.OvhApiCloudProjectSnapshot = OvhApiCloudProjectSnapshot;
        this.OvhApiCloudProjectSshKey = OvhApiCloudProjectSshKey;
        this.RegionService = RegionService;
        this.ServiceHelper = ServiceHelper;
        this.ovhDocUrl = ovhDocUrl;
    }

    $onInit () {
        this.serviceName = this.$stateParams.projectId;
        this.previousState = this.CloudNavigation.getPreviousState();
        this.loaders = {
            adding: false
        };
        this.model = {
            billingPeriod: null,
            flavor: null,
            imageType: null,
            name: "",
            networkId: "",
            number: 0,
            region: null,
            sshKey: null,
            userData: null
        };
        this.enums = {
            billingPeriods: ["monthly", "hourly"],
            flavorsTypes: [],
            imagesTypes: []
        };
        this.isNameUpdated = false;
        this.isPostScriptEnabled = false;
        this.newSshKey = {
            name: null,
            publicKey: null
        };
        this.state = {
            hasVRack: false
        };
        this.urls = {};
    }

    initProject () {
        // Get prices in background
        this.promisePrices = this.OvhCloudPriceHelper.getPrices(this.serviceName);

        // Get quota in background
        this.promiseQuota = this.OvhApiCloudProjectQuota.Lexi().query({ serviceName: this.serviceName }).$promise;

        // Get Public Networks in background
        this.promisePublicNetworks = this.OvhApiCloudProjectNetworkPublic.Lexi().query({ serviceName: this.serviceName }).$promise;

        // Set URLs
        this.urls.vLansApiGuide = this.ovhDocUrl.getDocUrl("g2162.public_cloud_et_vrack_-_comment_utiliser_le_vrack_et_les_reseaux_prives_avec_les_instances_public_cloud");
        // this.urls.guidesSshkeyURL = this.ovhDocUrl.getDocUrl("g1769.creating_ssh_keys");
    }

    cancel () {
        this.previousState.go();
    }

    confirm () {
        this.addVirtualMachine();
    }

    /*----------------------------------
     |  Step 1 : OS or SnapShot choice  |
     ----------------------------------*/

    initOsList () {
        _.set(this.loaders, "step1", true);
        return this.$q.all({
            images: this.OvhApiCloudProjectImage.Lexi().query({ serviceName: this.serviceName }).$promise
                .then(images => {
                    // Image types (linux, windows, ...)
                    this.enums.imagesTypes = _.uniq(_.pluck(images, "type"));
                    this.images = _.map(_.uniq(images, "id"), this.CloudImageService.augmentImage);
                })
                .catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_images_error")),
            snapshots: this.OvhApiCloudProjectSnapshot.Lexi().query({ serviceName: this.serviceName }).$promise
                .then(snapshots => (this.snapshots = _.map(snapshots, snapshot => _.set(snapshot, "distribution", "linux"))))
                .catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_shapshots_error")),
            sshKeys: this.OvhApiCloudProjectSshKey.Lexi().query({ serviceName: this.serviceName }).$promise
        })
            .then(({ sshKeys }) => {
                this.displayedSnapshots = _.filter(this.snapshots, { status: "active" });
                this.displayedCustoms = [];
                this.displayedImages = this.CloudImageService.groupImagesByType(this.images, this.enums.imagesTypes);
                this.displayedApps = _.uniq(_.forEach(this.CloudImageService.getApps(this.images), app => {
                    delete app.region;
                    delete app.id;
                }), "name");

                this.displayedSshKeys = sshKeys;
            })
            .catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_general_error"))
            .finally(() => {
                this.loaders.step1 = false;
            });
    }

    isStep1Valid () {
        return this.model.imageType && (this.model.imageType.type !== "linux" || this.model.sshKey);
    }

    resetStep1 () {
        _.set(this.model, "imageType", null);
        _.set(this.model, "sshKey", null);
        this.resetStep2();
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
            .catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_sshKey_adding_ERROR"))
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

    /*-----------------------------------------
     |  Step 2 : Region and DataCenter choice  |
     -----------------------------------------*/

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
                .catch(this.ServiceHelper.errorHandler("cpcivm_add_step2_quota_ERROR"))
        })
            .then(() => {
                _.forEach(this.displayedRegions, region => {
                    // Add quota info
                    this.RegionService.constructor.addOverQuotaInfos(region, this.quota);

                    // Check SSH Key opportunity
                    this.checkSshKeyByRegion();
                });

                this.groupedRegions = _.groupBy(this.displayedRegions, "continent");
            })
            .catch(this.ServiceHelper.errorHandler("cpcivm_add_step2_regions_ERROR"))
            .finally(() => {
                this.loaders.step2 = false;
            });
    }

    isStep2Valid () {
        return this.model.region && this.model.imageId;
    }

    resetStep2 () {
        _.set(this.model, "region", null);
        this.resetStep3();
    }

    setImageId () {
        if (_.get(this.model, "imageType.visibility", "") === "private") { // snapshot
            this.model.imageId = this.model.imageType;
        } else {
            this.model.imageId = _.find(this.images, {
                apps: this.model.imageType.apps || false,
                distribution: this.model.imageType.distribution,
                nameGeneric: this.model.imageType.nameGeneric,
                region: this.model.region.microRegion.code,
                status: "active",
                type: this.model.imageType.type || "linux"
            });
        }
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

    /*--------------------------------------
     |  Step 3: Instance and configuration  |
     --------------------------------------*/

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
            hasVRack: this.OvhApiCloudProject.Lexi().vrack({ serviceName: this.serviceName }).$promise
                .then(() => true)
                .catch(err => {
                    if (_.get(err, "status") === 404) {
                        return false;
                    }
                    return null;
                }),
            prices: this.promisePrices
                .then(prices => (this.prices = prices))
                .catch(this.ServiceHelper.errorHandler("cpcivm_add_step3_flavor_prices_ERROR")),
            publicNetworks: this.promisePublicNetworks
                .then(publicNetworks => (this.publicNetworks = publicNetworks))
                .catch(() => (this.publicNetworks = []))
        })
            .then(({ flavors, hasVRack }) => {
                // Set instance creation number to 1
                this.model.number = 1;

                // Get Private Networks asynchronously
                this.state.hasVRack = hasVRack;
                if (hasVRack) {
                    this.getPrivateNetworks();
                }

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
                        const categoryObject = _.find(categorizedFlavors, { category: category.id });
                        if (categoryObject) {
                            categoryObject.flavors = _(categoryObject.flavors).concat(_.filter(this.displayedFlavors, { type: flavorType })).value();
                        } else {
                            categorizedFlavors.push({
                                category: category.id,
                                order: category.order,
                                flavors: _.filter(this.displayedFlavors, { type: flavorType })
                            });
                        }
                    }
                });
                this.groupedFlavors = _.sortBy(categorizedFlavors, "order");
            })
            .catch(this.ServiceHelper.errorHandler("cpcivm_add_step3_flavors_ERROR"))
            .finally(() => {
                this.loaders.step3 = false;
            });
    }

    isStep3Valid () {
        return this.model.flavor != null && !_.isEmpty(this.model.name) && this.model.number > 0 && (!this.state.hasVRack || !_.isEmpty(this.model.networkId));
    }

    resetStep3 () {
        _.set(this.model, "flavor", null);
        _.set(this.model, "network", null);
        _.set(this.model, "number", 1);
        this.resetStep4();
    }

    enablePostScript () {
        this.isPostScriptEnabled = true;
    }

    getPrivateNetworks () {
        _.set(this.loaders, "privateNetworks", true);
        return this.OvhApiCloudProjectNetworkPrivate.Lexi().query({ serviceName: this.serviceName }).$promise.then(networks => {
            this.privateNetworks = networks;
            return this.getPrivateNetworksSubNets();
        }).then(subNets => {
            this.displayedPrivateNetworks = _.chain(this.privateNetworks)
                .filter(network => {
                    if (!_.has(subNets, network.id)) {
                        return false;
                    }
                    return _.some(network.regions, "region", this.model.region.microRegion.code);
                })
                .sortBy("vlanId")
                .map(network => {
                    const pad = Array(5).join("0");
                    return _.assign(network, {
                        vlanId: pad.substring(0, pad.length - network.vlanId.toString().length) + network.vlanId
                    });
                })
                .value();
        }).catch(() => {
            this.displayedPrivateNetworks = [];
        }).finally(() => {
            this.loaders.privateNetworks = false;
        });
    }

    getPrivateNetworksSubNets () {
        let networkIds = [];
        return _.chain(this.privateNetworks)
            .map(_.property("id"))
            .tap(ids => (networkIds = ids))
            .map(networkId => this.OvhApiCloudProjectNetworkPrivateSubnet.Lexi().query({ serviceName: this.serviceName, networkId }).$promise)
            .thru(promises => { // .mapKeys on a more recent lodash.
                const collection = {};
                _.forEach(promises, (promise, key) => {
                    collection[networkIds[key]] = promise;
                });
                return this.$q.all(collection);
            })
            .value()
            .then(subNets => subNets)
            .catch(() => []);
    }

    setInstanceName () {
        if (_.isEmpty(this.model.name) || !this.isNameUpdated) {
            this.model.name = `${_.get(this.model, "flavor.name", "")}-${_.get(this.model, "region.microRegion.code", "")}`.toLowerCase();
        }
    }

    showQuotaMessage (type, params = null) {
        this.ControllerModalHelper.showWarningModal({
            title: this.$translate.instant(`cpcivm_add_step3_disabled_${type}`),
            message: this.$translate.instant(`cpcivm_add_step3_disabled_message_${type}`, params)
        });
    }

    /*--------------------------
     |  Step 4: Billing period  |
     --------------------------*/

    isStep4Valid () {
        return _.isString(this.model.billingPeriod) && !_.isEmpty(this.model.billingPeriod);
    }

    resetStep4 () {
        _.set(this.model, "billingPeriod", null);
    }

    /*-------------------
     |  Submit the form  |
     -------------------*/

    addVirtualMachine () {
        this.loaders.adding = true;
        let promiseVm;

        if (!_.isEmpty(this.model.networkId) && this.model.networkId !== "none") {
            this.model.networks = [{ networkId: this.model.networkId }, { networkId: _.first(this.publicNetworks).id }];
        }

        const postVm = {
            flavorId: _.get(this.model, "flavor.id"),
            imageId: _.get(this.model, "imageId.id"),
            name: _.get(this.model, "name", "No Name"),
            region: _.get(this.model, "region.microRegion.code"),
            sshKeyId: _.get(this.model, "sshKey.id", undefined),
            monthlyBilling: _.get(this.model, "billingPeriod", "") === "monthly",
            userData: _.get(this.model, "userData", undefined),
            networks: _.get(this.model, "networks", undefined)
        };

        if (this.model.number > 1) {
            _.set(postVm, "number", this.model.number);
            promiseVm = this.OvhApiCloudProjectInstance.Lexi().bulk({ serviceName: this.serviceName }, postVm).$promise;
        } else {
            promiseVm = this.OvhApiCloudProjectInstance.Lexi().save({serviceName: this.serviceName }, postVm).$promise;
        }

        return promiseVm.then(() => {
            this.previousState.go();
        }).catch(this.ServiceHelper.errorHandler("cpcivm_add_launch_ERROR")).finally(() => {
            this.loaders.adding = false;
        });
    }
}

angular.module("managerApp").controller("CloudProjectComputeInfrastructureVirtualMachineAddCtrl", CloudProjectComputeInfrastructureVirtualMachineAddCtrl);

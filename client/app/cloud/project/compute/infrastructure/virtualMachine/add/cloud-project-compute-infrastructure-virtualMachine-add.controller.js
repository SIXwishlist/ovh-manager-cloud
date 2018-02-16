class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
    constructor ($q, $stateParams,
                 CloudFlavorService, CloudImageService, CloudNavigation, CloudProjectVirtualMachineAddService,
                 OvhCloudPriceHelper, OvhApiCloudProjectFlavor, OvhApiCloudProjectImage, OvhApiCloudProjectNetworkPrivate,
                 OvhApiCloudProjectNetworkPublic, OvhApiCloudProjectQuota, OvhApiCloudProjectRegion, OvhApiCloudProjectSnapshot, OvhApiCloudProjectSshKey,
                 CurrencyService, RegionService, ServiceHelper, ovhDocUrl) {
        this.$q = $q;
        this.$stateParams = $stateParams;
        this.CloudFlavorService = CloudFlavorService;
        this.CloudImageService = CloudImageService;
        this.CloudNavigation = CloudNavigation;
        this.OvhCloudPriceHelper = OvhCloudPriceHelper;
        this.OvhApiCloudProjectFlavor = OvhApiCloudProjectFlavor;
        this.OvhApiCloudProjectImage = OvhApiCloudProjectImage;
        this.OvhApiCloudProjectNetworkPrivate = OvhApiCloudProjectNetworkPrivate;
        this.OvhApiCloudProjectNetworkPublic = OvhApiCloudProjectNetworkPublic;
        this.OvhApiCloudProjectQuota = OvhApiCloudProjectQuota;
        this.OvhApiCloudProjectRegion = OvhApiCloudProjectRegion;
        this.OvhApiCloudProjectSnapshot = OvhApiCloudProjectSnapshot;
        this.OvhApiCloudProjectSshKey = OvhApiCloudProjectSshKey;
        this.CurrencyService = CurrencyService;
        this.RegionService = RegionService;
        this.ServiceHelper = ServiceHelper;
        this.VirtualMachineAddService = CloudProjectVirtualMachineAddService;
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
        this.urls.guidesSshkey = this.ovhDocUrl.getDocUrl("g1769.creating_ssh_keys");
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
                    this.enums.imagesTypes = this.CloudImageService.constructor.getImageTypes(images);
                    this.images = this.VirtualMachineAddService.getAugmentedImages(images);
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
                this.displayedApps = this.VirtualMachineAddService.getImageApps(this.images);
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
        _.set(this.loaders, "addingSsh", true);
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
                this.checkSshKeyByRegion(newSshKey.regions);
            })
            .catch(this.ServiceHelper.errorHandler("cpcivm_add_step1_sshKey_adding_ERROR"))
            .finally(() => {
                this.resetAddingSshKey();
                this.loaders.addingSsh = false;
            });
    }

    resetAddingSshKey () {
        _.set(this.newSshKey, "name", null);
        _.set(this.newSshKey, "publicKey", null);
        this.addingSshKey = false;
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
                    this.displayedRegions = this.VirtualMachineAddService.getRegionsByImageType(this.regions, this.images, this.model.imageType);
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
                    this.RegionService.constructor.checkSshKey(region, this.model.sshKey.regions);
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
        if (this.CloudImageService.isSnapshot(this.model.imageType)) {
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

    checkSshKeyByRegion (sshKeyRegions) {
        _.forEach(this.displayedRegions, region => {
            this.RegionService.constructor.checkSshKey(region, sshKeyRegions);
        });
    }

    updateSshKeyRegion () {
        return this.VirtualMachineAddService.openSshKeyRegionModal(this.model.sshKey)
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
                _.set(_.find(this.displayedSshKeys, { id: sshKey.id }), "regions", sshKey.regions);
                this.checkSshKeyByRegion(sshKey.regions);
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

        // Set instance creation number to 1
        this.model.number = 1;

        return this.$q.all({
            flavors: this.OvhApiCloudProjectFlavor.Lexi().query({ serviceName: this.serviceName }).$promise
                .then(flavors => {
                    this.flavors = flavors;
                    const filteredFlavors = this.VirtualMachineAddService.getAugmentedFlavorsFilteredByType(flavors, this.model.imageType.type);
                    this.enums.flavorsTypes = this.CloudFlavorService.constructor.getFlavorTypes(filteredFlavors);
                    return filteredFlavors;
                }),
            hasVRack: this.VirtualMachineAddService.hasVRack(this.serviceName),
            prices: this.promisePrices
                .then(prices => (this.prices = prices))
                .catch(this.ServiceHelper.errorHandler("cpcivm_add_step3_flavor_prices_ERROR")),
            publicNetworks: this.promisePublicNetworks
                .then(publicNetworks => (this.publicNetworks = publicNetworks))
                .catch(() => (this.publicNetworks = []))
        })
            .then(({ flavors, hasVRack }) => {
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

                const filteredFlavors = this.VirtualMachineAddService.getFilteredFlavorsByRegion(flavors, this.model.region.microRegion.code);
                this.groupedFlavors = this.VirtualMachineAddService.groupFlavorsByCategory(filteredFlavors, this.enums.flavorsTypes);
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
            return this.VirtualMachineAddService.getPrivateNetworksSubNets(this.serviceName, this.privateNetworks);
        }).then(subNets => {
            this.displayedPrivateNetworks = this.VirtualMachineAddService.getFilteredPrivateNetworksByRegion(this.privateNetworks, this.model.region.microRegion.code, subNets);
        }).catch(() => {
            this.displayedPrivateNetworks = [];
        }).finally(() => {
            this.loaders.privateNetworks = false;
        });
    }

    setInstanceName () {
        if (_.isEmpty(this.model.name) || !this.isNameUpdated) {
            this.model.name = `${_.get(this.model, "flavor.name", "")}-${_.get(this.model, "region.microRegion.code", "")}`.toLowerCase();
        }
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

        if (!_.isEmpty(this.model.networkId) && this.model.networkId !== "none") {
            this.model.networks = [{ networkId: this.model.networkId }, { networkId: _.first(this.publicNetworks).id }];
        }

        return this.VirtualMachineAddService.createVirtualMachine(this.serviceName, this.model)
            .then(() => {
                this.previousState.go();
            }).catch(this.ServiceHelper.errorHandler("cpcivm_add_launch_ERROR")).finally(() => {
                this.loaders.adding = false;
            });
    }
}

angular.module("managerApp").controller("CloudProjectComputeInfrastructureVirtualMachineAddCtrl", CloudProjectComputeInfrastructureVirtualMachineAddCtrl);

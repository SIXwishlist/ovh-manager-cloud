class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
    constructor ($scope, $q, $stateParams,
                 CloudFlavorService, CloudImageService, CloudNavigation,
                 OvhCloudPriceHelper, OvhApiCloudProjectFlavor, OvhApiCloudProjectImage, OvhApiCloudProjectQuota, OvhApiCloudProjectRegion, OvhApiCloudProjectSnapshot,
                 RegionService, ServiceHelper) {
        this.$scope = $scope;
        this.$q = $q;
        this.$stateParams = $stateParams;
        this.CloudFlavorService = CloudFlavorService;
        this.CloudImageService = CloudImageService;
        this.CloudNavigation = CloudNavigation;
        this.OvhCloudPriceHelper = OvhCloudPriceHelper;
        this.OvhApiCloudProjectFlavor = OvhApiCloudProjectFlavor;
        this.OvhApiCloudProjectImage = OvhApiCloudProjectImage;
        this.OvhApiCloudProjectQuota = OvhApiCloudProjectQuota;
        this.OvhApiCloudProjectRegion = OvhApiCloudProjectRegion;
        this.OvhApiCloudProjectSnapshot = OvhApiCloudProjectSnapshot;
        this.RegionService = RegionService;
        this.ServiceHelper = ServiceHelper;
    }

    $onInit () {
        this.serviceName = this.$stateParams.projectId;
        this.previousState = this.CloudNavigation.getPreviousState();
        this.loaders = {
            adding: false,
            init: false
        };
        this.model = {
            name: null,
            flavorId: null,
            imageId: null,
            imageType: null,
            region: null
        };
        this.enums = {
            flavorsTypes: [],
            imagesTypes: [],
            zonesTypes: ["public", "dedicated"]
        };
    }

    initProject () {
        this.loaders.init = true;
        return this.$q.all({
            quota: this.OvhApiCloudProjectQuota.Lexi().query({ serviceName: this.serviceName }).$promise.catch(this.ServiceHelper.errorHandler("cpcivm_addedit_quota_error"))
        }).then(({ quota }) => {
            this.quota = quota;
        }).finally(() => {
            this.loaders.init = false;
        });
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
            images: this.OvhApiCloudProjectImage.Lexi().query({ serviceName: this.serviceName }).$promise,
            snapshots: this.OvhApiCloudProjectSnapshot.Lexi().query({ serviceName: this.serviceName }).$promise
        }).then(({ images, snapshots }) => {
            // Image types (linux, windows, ...)
            this.enums.imagesTypes = _.uniq(_.pluck(images, "type"));
            this.images = _.map(_.uniq(images, "id"), this.CloudImageService.augmentImage);

            this.displayedSnapshots = _.filter(snapshots, { status: "active" });
            this.displayedImages = this.CloudImageService.groupImagesByType(this.images, this.enums.imagesTypes);
            this.displayedApps = _.uniq(_.forEach(this.CloudImageService.getApps(this.images), app => {
                delete app.region;
                delete app.id;
            }), "name");
        }).finally(() => {
            this.loaders.step1 = false;
        });
    }

    isStep1Valid () {
        return this.model.imageType && this.model.sshKeyId == null;
    }

    resetStep1 () {
        _.set(this.model, "imageType", null);
        _.set(this.model, "region", null);
    }

    /*
        Step 2: Region and DataCenter choice
     */
    initRegionsAndDataCenters () {
        _.set(this.loaders, "step2", true);
        return this.OvhApiCloudProjectRegion.Lexi().query({ serviceName: this.serviceName }).$promise.then(regions => {
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

            // Add quota info
            _.forEach(this.displayedRegions, region => this.RegionService.constructor.addOverQuotaInfos(region, this.quota));

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
                    this.displayedFlavors = _.map(_.filter(this.flavors, {
                        available: true,
                        osType: this.model.imageType.type
                    }), flavor => this.CloudFlavorService.augmentFlavor(flavor));
                    this.enums.flavorsTypes = this.CloudFlavorService.constructor.getFlavorTypes(this.displayedFlavors);
                }),
            prices: this.OvhCloudPriceHelper.getPrices(this.serviceName)
                .then(prices => (this.prices = prices))
                .catch(this.ServiceHelper.errorHandler("cpcivm_addedit_flavor_price_error"))
        }).then(() => {
            _.forEach(this.displayedFlavors, flavor => {
                this.CloudFlavorService.constructor.addPriceInfos(flavor, this.prices);
                this.CloudFlavorService.constructor.addOverQuotaInfos(flavor, this.quota);
            });

            _.forEach(this.enums.flavorsTypes, flavorType => {
                const category = this.CloudFlavorService.getCategory(flavorType, true);
            });
        }).finally(() => {
            this.loaders.step3 = false;
        });
    }

    isStep3Valid () {
        return false;
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

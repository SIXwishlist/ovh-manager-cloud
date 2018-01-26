class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
    constructor ($scope, $q, $stateParams,
                 CloudImageService, CloudNavigation,
                 OvhApiCloudProjectImage, OvhApiCloudProjectQuota, OvhApiCloudProjectRegion, OvhApiCloudProjectSnapshot,
                 RegionService, ServiceHelper) {
        this.$scope = $scope;
        this.$q = $q;
        this.$stateParams = $stateParams;
        this.CloudImageService = CloudImageService;
        this.CloudNavigation = CloudNavigation;
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
            init: false,
            step1: false
        };
        this.model = {
            name: null,
            flavorId: null,
            imageId: null,
            imageType: null,
            region: null,
            snapshotId: null
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
            quota: this.OvhApiCloudProjectQuota.Lexi().query({ serviceName: this.serviceName }).$promise.catch(this.ServiceHelper.errorHandler("cpcivm_addedit_quota_error")),
            regions: this.OvhApiCloudProjectRegion.Lexi().query({ serviceName: this.serviceName }).$promise
        }).then(({ quota, regions }) => {
            this.quota = quota;
            this.regions = _.map(regions, region => this.RegionService.getRegion(region));
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

    initOsList () {
        this.loaders.step1 = true;
        return this.$q.all({
            images: this.OvhApiCloudProjectImage.Lexi().query({ serviceName: this.serviceName }).$promise,
            snapshots: this.OvhApiCloudProjectSnapshot.Lexi().query({ serviceName: this.serviceName }).$promise
        }).then(({ images, snapshots }) => {
            // Image types (linux, windows, ...)
            this.enums.imagesTypes = _.uniq(_.pluck(images, "type"));
            this.images = _.map(_.uniq(images, "id"), this.CloudImageService.augmentImage);

            this.snapshots = _.filter(snapshots, { status: "active" });
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
        return false;
    }

    initRegionsAndDataCenters () {

    }

    initInstanceAndConfiguration () {

    }

    initBillingPeriod () {

    }

    addVirtualMachine () {
        this.loaders.adding = true;
    }
}

angular.module("managerApp").controller("CloudProjectComputeInfrastructureVirtualMachineAddCtrl", CloudProjectComputeInfrastructureVirtualMachineAddCtrl);

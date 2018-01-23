class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
    constructor ($scope, $q, $stateParams,
                 CloudNavigation,
                 OvhApiCloudProjectQuota,
                 RegionService, ServiceHelper) {
        this.$scope = $scope;
        this.$q = $q;
        this.$stateParams = $stateParams;
        this.CloudNavigation = CloudNavigation;
        this.OvhApiCloudProjectQuota = OvhApiCloudProjectQuota;
        this.regionService = RegionService;
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

    initOsList () {
        this.loaders.step1 = true;
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

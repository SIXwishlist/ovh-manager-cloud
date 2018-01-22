(() => {
    class CloudProjectComputeInfrastructureVirtualMachineAddCtrl {
        constructor ($scope, $q, $stateParams, $translate) {
            this.$scope = $scope;
            this.$q = $q;
            this.$stateParams = $stateParams;
            this.$translate = $translate;
        }

        $onInit () {
            this.serviceName = this.$stateParams.projectId;
        }
    }

    angular.module("managerApp").controller("CloudProjectComputeInfrastructureVirtualMachineAddCtrl", CloudProjectComputeInfrastructureVirtualMachineAddCtrl);
})();

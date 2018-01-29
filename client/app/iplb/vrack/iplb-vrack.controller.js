class IpLoadBalancerVrackCtrl {
    constructor ($state, $stateParams, $translate, ControllerHelper) {
        this.$state = $state;
        this.$stateParams = $stateParams;
        this.$translate = $translate;
        this.ControllerHelper = ControllerHelper;

        this._initActions();
    }

    _initActions () {
        this.actions = {
            activateVrack: {
                text: this.$translate.instant("common_activate"),
                callback: () => this.ControllerHelper.modal.showVrackAssociateModal(),
                isAvailable: () => true
            },
            addPrivateNetwork: {
                text: this.$translate.instant("iplb_vrack_private_network_add"),
                callback: () => this.$state.go("network.iplb.detail.vrack.add", { serviceName: this.$stateParams.serviceName }),
                isAvailable: () => true
            }
        };
    }
}

angular.module("managerApp").controller("IpLoadBalancerVrackCtrl", IpLoadBalancerVrackCtrl);

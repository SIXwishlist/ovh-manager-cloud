class VpsOrderWindowsCtrl {
    constructor ($q, $stateParams, $translate, $window, CloudMessage, CloudNavigation, VpsService) {
        this.$q = $q;
        this.$translate = $translate;
        this.serviceName = $stateParams.serviceName;
        this.$window = $window;
        this.CloudMessage = CloudMessage;
        this.CloudNavigation = CloudNavigation;
        this.VpsService = VpsService;

        this.loaders = {
            durations: false,
            prices: false
        };

        this.durations = {
            available : null,
            details : {}
        };

        this.model = {
            duration: null,
            url: null,
            contractsValidated: null
        };
    }

    $onInit () {
        this.previousState = this.CloudNavigation.getPreviousState();
    }


    getDurations () {
        this.loaders.durations = true;
        this.VpsService.getWindowsOptionDurations(this.serviceName)
            .then(durations => {
                this.durations.available = durations;
                this.loadPrices(durations);
            })
            .catch(err => this.CloudMessage.error(err.message || err))
            .finally(() => {this.loaders.durations = false});
    }

    loadPrices (durations) {
        let queue = [];
        this.loaders.prices = true;

        _.forEach(durations, duration => {
            queue.push(this.VpsService.getWindowsOptionOrder(duration)
                .then(details => { this.durations.details[duration] = details; })
            );
        });

        this.$q.all(queue)
            .then(() => {
                this.loaders.prices = false;
            })
            .catch(err => this.CloudMessage.error(err.data || this.$translate.instant("vps_order_windows_price_error")));
    }

    canValidateContracts () {
        this.model.contractsValidated = false;
        if (!this.durations.details[this.model.duration].contracts || !this.durations.details[this.model.duration].contracts.length) {
            return true;
        }
        return false;
    };

    orderOption () {
        this.VpsService.postWindowsOptionOrder(this.serviceName, this.model.duration)
            .then(order => {this.model.url = order.url;})
            .catch(error => this.CloudMessage.error(error || this.$translate.instant("vps_configuration_veeam_order_fail")));
    }

    cancel () {
        this.previousState.go();
    }

    confirm () {
        this.displayBC();
        this.previousState.go();
    }

    displayBC () {
        this.$window.open(
            this.model.url,
            "_blank"
        );
    }
}

angular.module("managerApp").controller("VpsOrderWindowsCtrl", VpsOrderWindowsCtrl);
class MetricOfferEditController {
    constructor ($uibModalInstance, ControllerHelper, currentOffer, MetricsOfferService, serviceName) {
        this.$uibModalInstance = $uibModalInstance;
        this.ControllerHelper = ControllerHelper;
        this.currentOffer = currentOffer;
        this.MetricsOfferService = MetricsOfferService;
        this.serviceName = serviceName;
    }

    $onInit () {
        this._initLoaders();
        this.offerUpgradeOptions.load()
            .catch(response => this.cancel(response));

        this.model = {
            offer: {
                value: this.currentOffer,
                required: true
            }
        };
    }

    confirm () {
        this.saving = true;

        return this.$uibModalInstance.close();
    }

    cancel () {
        this.$uibModalInstance.dismiss();
    }

    _initLoaders () {
        this.offerUpgradeOptions = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.MetricsOfferService.getOfferUpgradeOptions(this.serviceName)
        });
    }
}

angular.module("managerApp").controller("MetricOfferEditController", MetricOfferEditController);

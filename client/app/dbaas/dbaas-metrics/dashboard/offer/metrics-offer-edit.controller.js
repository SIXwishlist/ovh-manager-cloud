class MetricOfferEditController {
    constructor ($uibModalInstance, ControllerHelper, currentOffer, serviceName) {
        this.$uibModalInstance = $uibModalInstance;
        this.ControllerHelper = ControllerHelper;

        this.serviceName = serviceName;
        this.currentOffer = currentOffer;
    }

    $onInit () {
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
}

angular.module("managerApp").controller("MetricOfferEditController", MetricOfferEditController);

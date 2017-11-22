class MetricOfferEditController {
    constructor ($q, $uibModalInstance, ControllerHelper, currentOffer, MetricsOfferService, serviceName) {
        this.$q = $q;
        this.$uibModalInstance = $uibModalInstance;
        this.ControllerHelper = ControllerHelper;
        this.currentOffer = currentOffer;
        this.MetricsOfferService = MetricsOfferService;
        this.serviceName = serviceName;
    }

    $onInit () {
        this._initLoaders();
        this.plans.load().catch(response => this.cancel(response));
        this.retentionPlans.load().catch(response => this.cancel(response));

        this.model = {
            planCode: {
                value: undefined,
                required: true
            },
            retentionPlanCode: {
                value: undefined,
                required: true
            }
        };
    }

    confirm () {
        if (this.form.$invalid) {
            return this.$q.reject();
        }


        this.saving = true;

        return this.$uibModalInstance.close();
    }

    cancel () {
        this.$uibModalInstance.dismiss();
    }

    isModalLoading () {
        return this.plans.loading;
    }

    _initLoaders () {
        this.plans = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.MetricsOfferService.getOfferUpgradeOptions(this.serviceName)
        });

        this.retentionPlans = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.MetricsOfferService.getRetentionUpgradeOptions(this.serviceName)
        });
    }
}

angular.module("managerApp").controller("MetricOfferEditController", MetricOfferEditController);

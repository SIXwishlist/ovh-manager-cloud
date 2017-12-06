class MetricOfferEditController {
    constructor ($q, $uibModalInstance, ControllerHelper, currentPlan, currentRetentionPlan, MetricsOfferService, serviceName) {
        this.$q = $q;
        this.$uibModalInstance = $uibModalInstance;
        this.ControllerHelper = ControllerHelper;
        this.currentPlan = currentPlan;
        this.currentRetentionPlan = currentRetentionPlan;
        this.MetricsOfferService = MetricsOfferService;
        this.serviceName = serviceName;

        this.model = {
            planCode: {
                value: undefined,
                required: true
            }
        };

        this.totalPrice = null;
    }

    $onInit () {
        this._initLoaders();
        this.plans.load()
            .catch(response => this.cancel(response));
    }

    confirm () {
        if (this.form.$invalid) {
            return this.$q.reject();
        }
        this.saving = true;

        return this.MetricsOfferService.upgradeMetricsPlan(this.serviceName, {
            planCode: this.model.planCode.value
        })
            .then(() => {
                this.$uibModalInstance.close();
            })
            .catch(() => {
                this.cancel();
            });
    }

    cancel () {
        this.$uibModalInstance.dismiss();
    }

    updateTotal () {
        const chosenPlan = _.find(this.plans.data, plan => this.model.planCode.value === plan.planCode);
        if (chosenPlan) {
            this.totalPrice = chosenPlan.totalPrice;
        }
    }

    isModalLoading () {
        return this.plans.loading || this.saving;
    }

    _initLoaders () {
        this.plans = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.MetricsOfferService.getOfferUpgradeOptions(this.serviceName)
        });
    }
}

angular.module("managerApp").controller("MetricOfferEditController", MetricOfferEditController);

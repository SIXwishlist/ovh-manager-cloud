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
            },
            retentionPlanCode: {
                value: undefined,
                required: true
            }
        };
    }

    $onInit () {
        this._initLoaders();
        this.plans.load()
            .catch(response => this.cancel(response));
        this.retentionPlans.load()
            .catch(response => this.cancel(response));
    }

    confirm () {
        if (this.form.$invalid) {
            return this.$q.reject();
        }
        this.saving = true;

        this.MetricsOfferService.upgradeMetricsPlan(this.serviceName, {
            planCode: this.model.planCode.value
        });

        return this.$uibModalInstance.close();
    }

    cancel () {
        this.$uibModalInstance.dismiss();
    }

    changePlanCode () {
        if (this.model.planCode.value && this.retentionPlans.data.length === 1) {
            this.model.retentionPlanCode.value = this.retentionPlans.data[0].planCode;
        } else {
            this.model.retentionPlanCode.value = undefined;
        }
    }

    updateTotal () {
        console.log("update total is missing");
    }

    canChangeRetention () {
        return this.retentionPlans.data.length > 1; // If only 1 plan is available it is the current plan.
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

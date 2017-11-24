class MetricActionService {
    constructor (ControllerHelper) {
        this.ControllerHelper = ControllerHelper;
    }

    openOfferEditModal (serviceName, currentPlan, currentRetentionPlan) {
        this.ControllerHelper.modal.showModal({
            modalConfig: {
                templateUrl: "app/dbaas/dbaas-metrics/dashboard/offer/metrics-offer-edit.html",
                controller: "MetricOfferEditController",
                controllerAs: "$ctrl",
                resolve: {
                    serviceName: () => serviceName,
                    currentPlan: () => currentPlan,
                    currentRetentionPlan: () => currentRetentionPlan
                }
            }
        });
    }
}

angular.module("managerApp").service("MetricActionService", MetricActionService);

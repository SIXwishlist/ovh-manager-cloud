class MetricsOfferService {
    constructor (OvhApiMetricsOrder, ServiceHelper) {
        this.OvhApiMetricsOrder = OvhApiMetricsOrder;
        this.ServiceHelper = ServiceHelper;
    }

    getOfferUpgradeOptions (serviceName) {
        return this.OvhApiMetricsOrder.Upgrade().Lexi().query({ serviceName })
            .$promise
            .then(response => response)
            .catch(this.ServiceHelper.errorHandler("some error message"));
    }
}

angular.module("managerApp").service("MetricsOfferService", MetricsOfferService);

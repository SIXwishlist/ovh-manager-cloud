class DeskaasCtrl {
    constructor ($q, $translate, OvhApiDeskaasService) {
        this.$q = $q;
        this.$translate = $translate;
        this.OvhApiDeskaasService = OvhApiDeskaasService;

        this.flags = {
            initializing: true
        };
        this.services = [];
    }

    $onInit () {
        this.flags.initializing = true;
        this.$q.all([this.getServices()]).then(() => {
            this.flags.initializing = false;
        });
    }

    registerService (details, serviceInfo, user) {
        this.services.push({
            details,
            serviceInfo,
            user
        });
    }

    loadService (serviceId) {
        const servicePromise = this.OvhApiDeskaasService.Lexi().serviceInfos({ serviceName: serviceId }).$promise;
        servicePromise.then(serviceInfo => {
            const detailsPromise = this.OvhApiDeskaasService.Lexi().getDetails({ serviceName: serviceId }).$promise;
            detailsPromise.then(details => {
                if (details.alias !== "noAlias") {
                    details.displayName = `${details.alias} (${details.serviceName})`;
                } else {
                    details.displayName = details.serviceName;
                }

                if (serviceInfo.status === "ok") {
                    const userPromise = this.OvhApiDeskaasService.Lexi().getUser({ serviceName: serviceId }).$promise;
                    userPromise.then(user => {
                        user.displayName = `${user.name} (${user.email})`;
                        this.registerService(details, serviceInfo, user);
                    });
                } else {
                    this.registerService(details, serviceInfo, { displayName: "-" });
                }
            });
        });
        return servicePromise;
    }

    getServices () {
        const promise = this.OvhApiDeskaasService.Lexi().getServices().$promise;

        return promise.then(serviceIds => {
            const promises = [];
            serviceIds.forEach(serviceId => promises.push(this.loadService(serviceId)));
            return this.$q.all(promises);
        });
    }

}

angular.module("managerApp").controller("DeskaasCtrl", DeskaasCtrl);

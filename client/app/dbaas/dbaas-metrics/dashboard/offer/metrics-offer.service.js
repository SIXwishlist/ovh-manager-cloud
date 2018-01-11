class StringWeightShirtSize {
    evaluate (string) {
        // Some string are weighted using shirt sizes (xxs, xs, s, m, l, etc).  We return an appropriate weight represented by a number.
        const shirtSize = (new RegExp(/^.+-(x*[sml])/)).exec(string)[1];

        let weight = 0;
        let prefixWeight = 0;
        _.forEach(shirtSize, char => {
            switch (char) {
                case "x" : prefixWeight += 1;
                    break;
                case "s" : weight += 10 - prefixWeight;
                    break;
                case "m" : weight += 20;
                    break;
                case "l" : weight += 30 + prefixWeight;
                    break;
                default :
                    weight += 0;
            }
        });

        return weight;
    }
}

class StringWeightDuration {
    evaluate (string) {
        // Some string are weighted using durations (1y, 2m, 5d, etc).  We return an appropriate weight represented by a number.
        const duration = (new RegExp(/^.+-([0-9]+)([hdmy])/)).exec(string);

        let durationWeight = Number(duration[1]);
        switch (duration[2]) {
            case "d" : durationWeight = durationWeight * (1 / 365);
                break;
            case "m" : durationWeight = durationWeight * (1 / 30);
                break;
            default :
                durationWeight += 0;
        }

        return durationWeight;
    }
}

class StringWeightAggregate {
    constructor () {
        this.stringWeights = [];
    }

    push (stringWeight) {
        this.stringWeights.push(stringWeight);
    }

    // Evaluate weight aggration.  Each children aggregate should return a score of 1000 or below.
    // Childs are evaluated in order.  In other words, first child weight more than the last by default.
    evaluate (string) {
        let totalWeight = 0;
        for (let i = 0; i < this.stringWeights.length; i++) {
            const weight = this.stringWeights[i].evaluate(string);
            totalWeight += Math.pow(weight * 10, 3 * (this.stringWeights.length - i));
        }
        return totalWeight;
    }
}

class MetricsOfferService {
    constructor ($q, $translate, $window, OvhApiMetrics, OvhApiMetricsOrder, ServiceHelper) {
        this.$q = $q;
        this.$translate = $translate;
        this.$window = $window;
        this.OvhApiMetrics = OvhApiMetrics;
        this.OvhApiMetricsOrder = OvhApiMetricsOrder;
        this.ServiceHelper = ServiceHelper;
    }

    getOfferUpgradeOptions (serviceName) {
        return this.$q.all({
            metricInfo: this.OvhApiMetrics.Lexi().get({ serviceName }).$promise,
            plans: this.OvhApiMetricsOrder.Upgrade().Lexi().query({ serviceName }).$promise
        })
            .then(upgradeInfo => {
                const stringWeight = new StringWeightShirtSize();
                upgradeInfo.plans = _.filter(upgradeInfo.plans, plan => plan.planCode !== "metrics-free-trial" &&
                    stringWeight.evaluate(plan.planCode) > stringWeight.evaluate(upgradeInfo.metricInfo.offer));

                _.forEach(upgradeInfo.plans, plan => {
                    plan.planCodeWeight = stringWeight.evaluate(plan.planCode);
                    plan.totalPrice = _.sum(plan.prices, "priceInUcents");
                });

                return upgradeInfo.plans;
            })
            .catch(this.ServiceHelper.errorHandler("Some error lol"));
    }

    upgradeMetricsPlan (serviceName, plan) {
        let newWindow = this.$window.open("", "_blank");
        newWindow.document.write(this.$translate.instant("common_order_doing"));
        return this.OvhApiMetricsOrder.Upgrade().Lexi().post({
            serviceName,
            planCode: plan.planCode
        })
            .$promise
            .then(this.ServiceHelper.orderSuccessHandler(newWindow))
            .catch(this.ServiceHelper.orderErrorHandler(newWindow));
    }
}

angular.module("managerApp").service("MetricsOfferService", MetricsOfferService);

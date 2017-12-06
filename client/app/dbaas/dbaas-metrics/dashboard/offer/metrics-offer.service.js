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
    constructor ($q, OvhApiMetricsOrder, ServiceHelper) {
        this.$q = $q;
        this.OvhApiMetricsOrder = OvhApiMetricsOrder;
        this.ServiceHelper = ServiceHelper;
    }

    getOfferUpgradeOptions (serviceName) {
        return this.OvhApiMetricsOrder.Upgrade().Lexi().query({ serviceName })
            .$promise
            .then(plans => {
                plans = _.filter(plans, plan => plan.planCode !== "metrics-free-trial");
                const stringWeight = new StringWeightAggregate();
                stringWeight.push(new StringWeightShirtSize());
                // stringWeight.push(new StringWeightDuration());

                _.forEach(plans, plan => {
                    plan.planCodeWeight = stringWeight.evaluate(plan.planCode);
                    plan.totalPrice = _.sum(plan.prices, "priceInUcents");
                });
                return plans;
            })
            .catch(this.ServiceHelper.errorHandler());
    }

    upgradeMetricsPlan (serviceName, plan) {
        return this.OvhApiMetricsOrder.Upgrade().Lexi().post({
            serviceName,
            planCode: plan.planCode
        })
            .$promise
            .then(this.ServiceHelper.orderSuccessHandler())
            .catch(this.ServiceHelper.orderErrorHandler());
    }
}

angular.module("managerApp").service("MetricsOfferService", MetricsOfferService);

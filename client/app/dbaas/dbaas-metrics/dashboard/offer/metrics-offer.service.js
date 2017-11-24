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
            totalWeight += weight * 10 ** (3 * (this.stringWeights.length - i));
        }
        return totalWeight;
    }
}

class MetricsOfferService {
    constructor ($q, OvhApiOrderCart, OvhApiMetrics, OvhApiMetricsOrder, ServiceHelper) {
        this.$q = $q;
        this.OvhApiOrderCart = OvhApiOrderCart;
        this.OvhApiMetrics = OvhApiMetrics;
        this.OvhApiMetricsOrder = OvhApiMetricsOrder;
        this.ServiceHelper = ServiceHelper;
    }

    getOfferUpgradeOptions (serviceName) {
        return this.OvhApiMetricsOrder.Upgrade().Lexi().query({ serviceName })
            .$promise
            .then(plans => {
                // API should do this.                
                plans = _.filter(plans, plan => plan.planCode !== "metrics-free-trial");
                const stringWeight = new StringWeightAggregate();
                stringWeight.push(new StringWeightShirtSize());
                //  stringWeight.push(new StringWeightDuration());

                _.forEach(plans, plan => {
                    plan.planCodeWeight = stringWeight.evaluate(plan.planCode);
                });
                return plans;
            })
            .catch(this.ServiceHelper.errorHandler("some error message"));

        // Waiting on API to be completed.  Hard to predict what it will look like atm.
        /*  const promises = {
            plans: this._getMetricsPlanCodes(),
            upgradeOptions: this.OvhApiMetricsOrder.Upgrade().Lexi().query({ serviceName }).$promise
        };

        return this.$q.all(promises)
            .then(response => {
                const extractPlanCode = new RegExp(/^(.+)-[0-9]+y/);
                const upgradablePlanCodes = _.uniq(_.map(response.upgradeOptions, upgradeOption => {
                    return extractPlanCode.exec(upgradeOption.planCode)[1];
                }));

                const stringWeight = new StringWeightShirtSize();
                return _.map(_.filter(response.plans, plan => _.includes(upgradablePlanCodes, plan.planCode)), plan => {
                    plan.planCodeWeight = stringWeight.evaluate(plan.planCode);
                    return plan;
                });
            })
            .catch(this.ServiceHelper.errorHandler("some error message"));*/
    }

    getRetentionUpgradeOptions (serviceName) {
        return this.OvhApiMetrics.Lexi().get({ serviceName })
            .$promise
            .then(metrics => {
                const retentienPlanCode = `${metrics.offer}-${metrics.quota.retention / 12}y`;
                return [{
                    productType: "delivery",
                    productName: retentienPlanCode,
                    planCode: retentienPlanCode,
                    prices: [
                        {
                            priceInUcents: 499000000,
                            capacities: [
                                "renew"
                            ],
                            pricingMode: "default",
                            duration: "P1M",
                            interval: 1,
                            description: "Metrics Cloud Plan - xs (1kseries)",
                            minimumRepeat: 1,
                            pricingType: "rental",
                            maximumQuantity: 1,
                            maximumRepeat: null,
                            minimumQuantity: 1,
                            price: {
                                currencyCode: "EUR",
                                value: 0,
                                text: "0 €"
                            }
                        }
                    ]
                }];
            })
            .catch(this.ServiceHelper.errorHandler("some error message"));
        
        // Waiting on API to be completed.  Hard to predict what it will look like atm.
        /*  return this.OvhApiMetricsOrder.Upgrade().Lexi().query({ serviceName })
            .$promise
            .then(plans => {
                const stringWeight = new StringWeightAggregate();
                stringWeight.push(new StringWeightShirtSize());
                //stringWeight.push(new StringWeightDuration());

                _.forEach(plans, plan => {
                    plan.planCodeWeight = stringWeight.evaluate(plan.planCode);
                });
                return plans;
            })
            .catch(this.ServiceHelper.errorHandler("some error message"));*/
    }

    upgradeMetricsPlan (serviceName, plan) {
        return this.OvhApiMetricsOrder.Upgrade().post({ serviceName }, { plan: plan.planCode })
            .$promise()
            .then(this.ServiceHelper.successHandler("some success message"))
            .catch(this.ServiceHelper.errorHandler("some error message"));
    }

    _getMetricsPlanCodes () {
        let cartId = "";
        return this.OvhApiOrderCart.Lexi().post({}, { ovhSubsidiary: "FR" })
            .$promise
            .then(cart => this.OvhApiOrderCart.Lexi().assign({ cartId: cart.cartId }).$promise.then(() => { cartId = cart.cartId; }))
            .then(() => this.OvhApiOrderCart.Product().Lexi().get({ cartId }, { productId: "metrics" }).$promise)
            .then(plans => this.OvhApiOrderCart.Lexi().delete({ cartId }).$promise.then(() => plans));
    }
}

angular.module("managerApp").service("MetricsOfferService", MetricsOfferService);

(() => {

    const oldFlavorRegex = /eg|sp|hg|vps-ssd/;

    class CloudFlavorService {

        constructor (CLOUD_FLAVORTYPE_CATEGORY, CLOUD_INSTANCE_CPU_FREQUENCY) {
            this.CLOUD_FLAVORTYPE_CATEGORY = CLOUD_FLAVORTYPE_CATEGORY;
            this.CLOUD_INSTANCE_CPU_FREQUENCY = CLOUD_INSTANCE_CPU_FREQUENCY;
        }

        static isOldFlavor (flavorName) {
            return oldFlavorRegex.test(flavorName);
        }

        static getFlavorTypes (flavors) {
            return _.uniq(_.pluck(flavors, "type"));
        }

        static addPriceInfos (flavor, prices) {
            const price = { price: { value: 0 }, monthlyPrice: { value: 0 } };
            const planHourly = prices[_.get(flavor, "planCodes.hourly")];
            if (planHourly) {
                _.set(price, "price", planHourly.price);
                // Set 3 digits for hourly price
                _.set(price, "price.text", _.get(price, "price.text", "").replace(/\d+(?:[.,]\d+)?/, `${price.price.value.toFixed(3)}`));
            }
            const planMonthly = prices[_.get(flavor, "planCodes.monthly")];
            if (planMonthly) {
                _.set(price, "monthlyPrice", planMonthly.price);
            }
            _.set(flavor, "price", price);
        }

        static addOverQuotaInfos (flavor, quota) {
            const quotaByRegion = _.find(quota, { region: flavor.region });
            if (_.get(quotaByRegion, "instance", false)) {
                if (quotaByRegion.instance.maxInstances !== -1 && quotaByRegion.instance.usedInstances >= quotaByRegion.instance.maxInstances) {
                    flavor.disabled = "QUOTA_INSTANCE";
                } else if (flavor.ram && quotaByRegion.instance.maxRam !== -1 && flavor.ram > quotaByRegion.instance.maxRam - quotaByRegion.instance.usedRAM) {
                    flavor.disabled = "QUOTA_RAM";
                } else if (flavor.vcpus && quotaByRegion.instance.maxCores !== -1 && flavor.vcpus > quotaByRegion.instance.maxCores - quotaByRegion.instance.usedCores) {
                    flavor.disabled = "QUOTA_VCPUS";
                }
            }
        }

        augmentFlavor (flavor) {
            if (!flavor) {
                return null;
            }

            const augmentedFlavor = _.cloneDeep(flavor);
            augmentedFlavor.frequency = this.CLOUD_INSTANCE_CPU_FREQUENCY[flavor.type];

            if (/vps/.test(flavor.type)) {
                augmentedFlavor.vps = true;
                augmentedFlavor.diskType = "ssd";
                augmentedFlavor.flex = false;
                augmentedFlavor.shortGroupName = flavor.name;
            } else {
                let shortType;
                let numberType;
                if (flavor.osType === "windows") {
                    shortType = _.first(_.rest(flavor.name.split("-")));
                    numberType = _.first(_.rest(_.rest(flavor.name.split("-"))));
                } else {
                    shortType = _.first(flavor.name.split("-"));
                    numberType = _.first(_.rest(flavor.name.split("-")));
                }
                if (shortType) {
                    augmentedFlavor.shortType = shortType;
                }
                if (numberType) {
                    augmentedFlavor.numberType = numberType;
                }
                if (shortType && numberType) {
                    augmentedFlavor.shortGroupName = `${shortType}-${numberType}`;
                }
                augmentedFlavor.flex = /flex$/.test(flavor.name);
                augmentedFlavor.diskType = /ssd/.test(flavor.type) ? "ssd" : "ceph";

                if (_.indexOf(["g1", "g2", "g3"], augmentedFlavor.shortType) > -1) {
                    if (numberType === "120") {
                        augmentedFlavor.gpuCardCount = 3;
                    } else {
                        augmentedFlavor.gpuCardCount = 1;
                    }
                }
                augmentedFlavor.isOldFlavor = oldFlavorRegex.test(flavor.name);
            }

            return augmentedFlavor;
        }

        getCategory (flavorType, withDetails = false) {
            let category = null;
            for (const c of this.CLOUD_FLAVORTYPE_CATEGORY) {
                if (_.includes(c.types, flavorType)) {
                    category = withDetails ? c : _.get(c, "id");
                    break;
                }
            }
            return category;
        }
    }

    angular.module("managerApp").service("CloudFlavorService", CloudFlavorService);
})();

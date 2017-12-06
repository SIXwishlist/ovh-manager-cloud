(() => {
    const defaultSuccessMessage = "common_global_success";
    const defaultErrorMessage = "common_global_error";
    const defaultOrderSuccessMessage = "common_order_success";
    const defaultOrderErrorMessage = "common_order_error";

    class ServiceHelper {
        constructor ($q, $translate, $window, CloudMessage) {
            this.$q = $q;
            this.$translate = $translate;
            this.$window = $window;
            this.CloudMessage = CloudMessage;
        }


        errorHandler (message) {
            return err => {
                if (message) {
                    this.CloudMessage.error(this.$translate.instant(message, err.data));
                } else {
                    this.CloudMessage.error(_.get(err, "data.message", this.$translate.instant(defaultErrorMessage)));
                }

                return this.$q.reject(err);
            };
        }

        successHandler (message) {
            return data => {
                if (message) {
                    const jsonData = data && data.toJSON ? data.toJSON() : {};
                    this.CloudMessage.success(this.$translate.instant(message, jsonData));
                } else {
                    this.CloudMessage.success(this.$translate.instant(defaultSuccessMessage));
                }

                return data;
            };
        }

        orderSuccessHandler () {
            return data => {
                // FIXME: not working see: https://stackoverflow.com/questions/11821009/javascript-window-open-not-working
                this.$window.open(data.order.url, "_blank");

                this.CloudMessage.success({
                    textHtml: this.$translate.instant(defaultOrderSuccessMessage, {
                        orderUrl: data.order.url,
                        orderId: data.order.orderId
                    })
                });
            };
        }

        orderErrorHandler () {
            return err => this.errorHandler(defaultOrderErrorMessage)(err);
        }
    }

    angular.module("managerApp").service("ServiceHelper", ServiceHelper);
})();

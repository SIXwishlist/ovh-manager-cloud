class VpsHeaderCtrl {
    constructor ($rootScope, $stateParams, $translate, CloudMessage, Notification, STOP_NOTIFICATION_USER_PREF, VpsService) {
        this.$rootScope = $rootScope;
        this.$stateParams = $stateParams;
        this.$translate = $translate;
        this.CloudMessage = CloudMessage;
        this.Notification = Notification;
        this.STOP_NOTIFICATION_USER_PREF = STOP_NOTIFICATION_USER_PREF;
        this.serviceName = $stateParams.serviceName;
        this.description = $stateParams.displayName || $stateParams.serviceName;
        this.VpsService = VpsService;
        this.loaders = {
            init: false
        };
        this.stopNotification = {
            autoRenew: true,
            ipV6: true
        };
    }

    $onInit () {
        this.loaders.init = true;
        this.$rootScope.$on("changeDescription", (event, data) => {
            this.description = data;
        });
        this.VpsService.getSelectedVps(this.serviceName)
            .then(vps => {
                this.description = vps.displayName;
                this.checkMessages(vps);
            })
            .catch(() => this.CloudMessage.error(this.$translate.instant("vps_dashboard_loading_error")))
            .finally(() => { this.loaders.init = false });
    }

    checkMessages (vps) {
        this.isExpired(vps);
        this.isInRescueMode(vps.netbootMode);
        this.checkIfStopNotification("ipV6", true, vps);
    }

    isExpired(vps) {
        if (vps.isExpired) {
            this.CloudMessage.warning(this.$translate.instant("vps_service_expired", {vps: vps.name}));
        } else if (vps.messages.length > 0) {
            this.CloudMessage.error(this.$translate.instant("vps_dashboard_loading_error"), vps);
        }
    }

    isInRescueMode (netbootMode) {
        if (netbootMode === "RESCUE"){
            this.CloudMessage.warning({ textHtml: this.$translate.instant("vps_configuration_reboot_rescue_warning_text") });
        }
    }

    showIpV6Banner (version, ipv6) {
        const oldVersion = _.contains(version, "2014") || _.contains(version, "2013");
        const userAcknowledged = this.stopNotification.ipV6;
        if (!userAcknowledged && !oldVersion && ipv6) {
            this.CloudMessage.info({
                textHtml: this.$translate.instant("vps_configuration_ipV6_info_text"),
                dismissed: this.stopNotification.ipV6,
                dismiss: () => this.stopNotificationIpV6()
            });
        }
    }

    checkIfStopNotification (message, isArray, vps) {
        const item = vps.name;
        return this.Notification.checkIfStopNotification(this.STOP_NOTIFICATION_USER_PREF[message], isArray, item)
            .then(showNotification => {
                this.stopNotification[message] = showNotification;
                this.showIpV6Banner(vps.version, vps.ipv6);

            })
            .catch(() => { this.stopNotification[message] = false });
    }

    stopNotificationIpV6 () {
        this.stopNotification.ipV6 = true;
        this.Notification.stopNotification(this.STOP_NOTIFICATION_USER_PREF.ipV6, this.vps.name)
            .catch(() => this.CloudMessage.error(this.$translate.instant("vps_stop_bother_error")));
    };

}

angular.module("managerApp").controller("VpsHeaderCtrl", VpsHeaderCtrl);
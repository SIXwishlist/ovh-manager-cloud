class VpsDashboardCtrl {
    constructor ($filter, $stateParams, CloudMessage, VpsActionService, VpsService) {
        this.$filter = $filter;
        this.$stateParams = $stateParams;
        this.CloudMessage = CloudMessage;
        this.serviceName = $stateParams.serviceName;
        this.VpsActionService = VpsActionService;
        this.VpsService = VpsService;

        this.vps = {};
        this.vpsPolling = {
            rebootVm: false,
            setNetboot: false,
            setMonitoring: false,
            changeRootPassword: false,
            createSnapshot: false,
            deleteSnapshot: false,
            reinstallVm: false,
            revertSnapshot: false,
            restoreVeeamBackup: false,
            removeVeeamBackup: false,
            openConsoleAccess: false,
            getConsoleUrl: false,
            deliverVm: false,
            restoreVm: false
        };

        this.loaders = {
            init: false,
            polling: false
        }
    }

    $onInit () {
        this.loaders.init = true;
        this.loadData();
        this.loadIps();
    }

    loadData () {
        this.VpsService.getSelected(true)
            .then(vps => {
                this.vps = vps;
                const expiration = moment.utc(vps.expiration);
                this.vps.expiration = moment([expiration.year(), expiration.month(), expiration.date()]).toDate();
                this.vps.iconDistribution = vps.distribution ? "icon-" + vps.distribution.distribution : "";
                if (vps.isExpired) {
                    this.CloudMessage.warning($translate.instant("common_service_expired", [vps.name]));
                } else if (vps.messages.length > 0) {
                    this.CloudMessage.error($translate.instant("vps_dashboard_loading_error"), vps);
                }
            })
            .catch(err => this.CloudMessage.error(err))
            .finally(() => { this.loaders.init = false });
    }

    loadIps () {
        this.VpsService.getIps().then(ips => {
            this.vps.ips = ips.results;
            this.vps.ipv6Gateway = _.get(_.find(ips.results, { version: "v6" }), "gateway");
        });
    }

    setAction (action) {
        if (action == "reboot") {
            this.VpsActionService.reboot();
        }

    }

}

angular.module("managerApp").controller("VpsDashboardCtrl", VpsDashboardCtrl);
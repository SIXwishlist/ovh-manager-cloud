"use strict";

angular.module("managerApp").controller("DBaasTsProjectAddCtrl",
    function (OvhApiMe, DBaasTsConstants) {
        var self = this;

        OvhApiMe.v6().get().$promise.then(function (me) {
            var lang = me.ovhSubsidiary;
            var order = DBaasTsConstants.urls.order;

            self.orderUrl = order[lang] || order.FR;
        });
    });

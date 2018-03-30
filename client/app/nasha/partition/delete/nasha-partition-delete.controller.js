angular.module("managerApp").controller("NashaPartitionDeleteCtrl", function (OvhApiDedicatedNasha, $stateParams, $scope, $uibModalInstance, $translate, CloudMessage) {
    "use strict";

    var self = this;
    self.loading = false;
    self.data = {
        nashaId: $stateParams.nashaId,
        partition: $scope.$resolve.items
    };

    self.deletePartition = function () {
        self.loading = true;
        OvhApiDedicatedNasha.Partition().v6().delete({
            serviceName: self.data.nashaId,
            partitionName: self.data.partition.partitionName
        }).$promise.then(function (result) {
            $uibModalInstance.close({ partition: self.data.partition, tasks: [result.data.taskId] });
            CloudMessage.success($translate.instant("nasha_partitions_action_delete_success", { partitionName: self.data.partition.partitionName }));
        }).catch(function () {
            $uibModalInstance.dismiss();
            CloudMessage.error($translate.instant("nasha_partitions_action_delete_failure", { partitionName: self.data.partition.partitionName }));
        }).finally(function () {
            self.loading = false;
        });
    };

    self.dismiss = function () {
        $uibModalInstance.dismiss();
    };
});

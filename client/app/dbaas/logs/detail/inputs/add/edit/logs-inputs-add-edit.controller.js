class LogsInputsAddEditCtrl {
    constructor ($state, $stateParams, CloudMessage, ControllerHelper, LogsInputsAddEditConstant, LogsInputsService, LogsStreamsService) {
        this.$state = $state;
        this.$stateParams = $stateParams;
        this.serviceName = this.$stateParams.serviceName;
        this.inputId = this.$stateParams.inputId;
        this.CloudMessage = CloudMessage;
        this.ControllerHelper = ControllerHelper;
        this.LogsInputsAddEditConstant = LogsInputsAddEditConstant;
        this.LogsInputsService = LogsInputsService;
        this.LogsStreamsService = LogsStreamsService;

        this.editMode = Boolean(this.inputId);
        this.availableEngines = [];
        this._initLoaders();
    }

    $onInit () {
        if (this.editMode) {
            this.input.load();
        } else {
            this.input = this.LogsInputsService.getNewInput();
        }
        this.details.load()
            .then(details => {
                this.availableEngines = details.engines.reduce((enginesList, engine) => {
                    if (!engine.isDeprecated) {
                        enginesList.push(engine);
                    }
                    return enginesList;
                }, []);
            });
        this.streams.load();
        this.options.load();
        this.mainOffer.load();
    }

    /**
     * initializes the input log url
     *
     * @memberof LogsInputsAddEditCtrl
     */
    _initLoaders () {
        if (this.editMode) {
            this.input = this.ControllerHelper.request.getHashLoader({
                loaderFunction: () => this.LogsInputsService.getInput(this.serviceName, this.inputId)
                    .then(input => this.LogsInputsService.transformInput(input))
            });
        }
        this.details = this.ControllerHelper.request.getHashLoader({
            loaderFunction: () => this.LogsInputsService.getDetails(this.serviceName)
        });
        this.streams = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.LogsStreamsService.getStreams(this.serviceName)
        });
        this.options = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.LogsInputsService.getSubscribedOptions(this.serviceName)
        });
        this.mainOffer = this.ControllerHelper.request.getArrayLoader({
            loaderFunction: () => this.LogsInputsService.getMainOffer(this.serviceName)
        });
    }

    addEditInput () {
        if (this.form.$invalid) {
            return this.$q.reject();
        }

        this.CloudMessage.flushChildMessage();
        this.inputAddEdit = this.ControllerHelper.request.getHashLoader({
            loaderFunction: () => this.editMode ?
                this.LogsInputsService.updateInput(this.serviceName, this.input.data) :
                this.LogsInputsService.addInput(this.serviceName, this.input.data)
        });
        return this.inputAddEdit.load()
            .then(() => this.$state.go("dbaas.logs.detail.inputs.add.configure"));
    }
}

angular.module("managerApp").controller("LogsInputsAddEditCtrl", LogsInputsAddEditCtrl);

(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['SynProject','$location','$log','$q','$scope','$timeout'];

function SyntheaController(SynProject,$location,$log,$q,$scope,$timeout) {

    var sVm = this;
    window.sVm = sVm;
    this.SynProject_ = SynProject;
    this.$location_ = $location;
    this.$log_ = $log;
    this.$q_ = $q;
    this.$timeout_ = $timeout;

    // We need a mixer
    var mixer;
    // We need to track some variables
    var vars = {
        is_dj_mode: false,
    };

    ipcRenderer.on('edit-project', function(evt,projectDef) {

        // Are we passing in a new project to edit?
        if (projectDef) {
            sVm.loadProject(projectDef).then(function(project) {
                $location.path('/edit/'+project.key);
            });
        }
        // No? Then use the current project
        else {
            $location.path('/edit/'+
                this.SynProject_.getProject().key);
            $scope.$apply();

        }

    }.bind(this));

    // Listen for the main application to broadcast a project change
    ipcRenderer.on('open-project', function(event,projectDef) {
        // Did we get a project?
        if (projectDef) {
            // Open it!
            sVm.loadProject(projectDef);
        }
        // If we didn't get a project, clear out
        else {
            // Hearing this broadcast means we're ready
            sVm.ready = true;
            // Clear out any older project
            sVm.project = undefined;
            $location.path('/landing');
            // Nice title
            document.title = "Synthea";

            // This is an external callback, so time to digest!
            $scope.$apply();
        }
    });

    activate();

    function activate() {

    }

}

SyntheaController.prototype.browseCloudProjects = function() {
    ipcRenderer.send('browse-cloud-projects');
}


SyntheaController.prototype.createProject = function() {
    ipcRenderer.send('open-create-project');
};


SyntheaController.prototype.loadProject = function(projectDef) {

    var defer = this.$q_.defer();

    // Tell the project service to do its business
    this.SynProject_.load(projectDef).then(function() {

        this.project = this.SynProject_.getProject();
        console.log("Project loaded!",this.project)

    // Get a page object and select it for our initial display
        this.selectPage( this.SynProject_.getPage() );

        // And a nice title
        document.title = 'Synthea: ' + this.project.name;

        // Trigger a route change!
        this.$location_.path('/player/'+projectDef.key);

        // Ready!
        this.ready = true;

        defer.resolve(this.project);

    }.bind(this));

    return defer.promise;

};

SyntheaController.prototype.openProjectFromFolder = function() {
    ipcRenderer.send('open-project-from-folder');
};

SyntheaController.prototype.openWeburl = function(url) {
    ipcRenderer.send('open-weburl', url);
};

/**
 * A method to select a page of sections/cues in the project. This is part of
 * the main controller because it's shared between SynPlayerController and
 * SynEditorController.
 *
 * @param  {Page} page A page object from the Project layout
 * @return {Page} The same page, set as `sVm.currentPage`
 */
SyntheaController.prototype.selectPage = function(page) {
    var pages = this.project.pages;
    var currentIdx = pages.indexOf(this.currentPage);

    // We can scroll
    if (page==='next') {
        if (currentIdx < pages.length-1) {
            page = pages[currentIdx + 1];
        } else {
            page = pages[0];
        }
    }
    else if (page==='prev') {
        if (currentIdx === 0) {
            page = pages[pages.length-1];
        } else {
            page = pages[currentIdx - 1];
        }
    }

    // Store this page so we can show it on the view
    this.currentPage = page;
    return page;
};

// IIFE
})();
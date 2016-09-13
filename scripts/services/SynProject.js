(function() {
'use strict';

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .service('SynProject',SynProject);

SynProject.$inject = ['$http','$q','$log'];

function SynProject($http,$q,$log) {

    // This is a singleton so every service/controller can access
    var project = {};
    var def = {};
    window.p = project;

    function copyMediaToProject() {

        var defer = $q.defer();

        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        });

        ipcRenderer.send('add-media-to-project',def.key);

        return defer.promise;

    }

    function load(projectDef,projectLayout) {

        // Copy the project def
        def = angular.copy(projectDef);

        // Reset the project!
        for (var prop in project) {
            if (project.hasOwnProperty(prop)) {
                delete project[prop];
            }
        }

        var defer = $q.defer();

        // Look for a layout file
        if (projectLayout) {
            console.log('Loading project from passed layout file')
            _processLayoutFile(projectLayout);
            defer.resolve();
        }

        // Look for a definition file that has a layout
        else if (projectDef.documentRoot) {
            console.log("Loading project from projectDef file")

            $http.get(projectDef.documentRoot + '/layout.json')
            .then(function(response){
                _processLayoutFile(response.data);
                defer.resolve();
            });

        }
        else {
            console.error('No known project format');
        }

        return defer.promise;
    }

    // Return a page by index, or default to zero
    function getPage(idx) {
        idx = parseInt(idx) || 0;
        return project.pages[idx];
    }

    function getProjectMediaList() {

        // Create a promise to async fetch the listing
        var defer = $q.defer();

        // Create a listener for the impending broadcast
        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        });

        ipcRenderer.send('get-project-media', {key: def.key});

        return defer.promise;
    }


    function _processLayoutFile(layoutfile) {
        angular.extend(project, layoutfile);

        // Make an id lookup for cues so we can bind hotkeys
        var cue_ids = {};

        // Catch erroneous bindings (i.e. hotkeys to cues that don't exist)
        for (var i=project.cues.length;i--;i>=0) {
            if (!project.cues[i]) {
                console.log("  removing hotkey ",project.cues[i]);
                project.cues.splice(i,1);
            }
        }

        // MIGRATION: Store the cue ids in the sections, for order
        var sections_to_add;
        if (!project.sections[0].cue_ids) {
            sections_to_add = {};
            angular.forEach(project.sections, function(s) {
                if (!s.cue_ids) {
                    s.cue_ids = [];
                }
                sections_to_add[s.id] = s.cue_ids;
            });
        }

        // Create our cue objects
        angular.forEach(project.cues, function(c, idx) {

            // Note the full path to the audio file, including the
            // documentRoot (which is NOT saved in the project)
            c._fullPath = def.documentRoot + '/audio/' +
                c.sources[0];
            // AVW: Phasing out in favor of cuesInSection
            // filter, but may regress if performance is hit too much
            // // Add to each column
            if (sections_to_add) {
                angular.forEach(c.section_ids, function(s) {
                    sections_to_add[s].push(c.id);
                });
            }
            delete(c.section_ids);
            if (c.subgroup==='__MUSIC__') {
                c.subgroup = 'music';
            }
            if (!c.loopFile) {
                delete(c.loopFile);
            }
            if (!c.tooltip) {
                delete(c.tooltip);
            }
            if (typeof(c.display_order)!=='undefined') {
                delete(c.display_order);
            }
            // And the lookup
            cue_ids[c.id] = c;
        });

        // Save it?
        if (sections_to_add) {
            console.warn("Updating sections with cue_ids array!")
            project.key = def.key;
            ipcRenderer.send('save-project', project)
        }

        // Map the cues to the hotkeys as well
        angular.forEach(project.hotKeys, function(h) {
            h.cue = cue_ids[h.target];
        });

        // Do we have a nice image?
        if (project.bannerImage) {
            project.bannerImage_ = 'url(\''+
                def.documentRoot + '/' +
                project.bannerImage + '\')';
        }
    }

    var SynProjectService = {
        copyMediaToProject: copyMediaToProject,
        load: load,
        // getConfig: getConfig,
        getPage: getPage,
        getProject: function() { return project; },
        getProjectDef: function() { return def; },
        getProjectMediaList: getProjectMediaList,
    };

    window.SynProject = SynProjectService;
    return SynProjectService;

}

// IIFE
})();
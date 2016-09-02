/**
 * SynMixer factory for instantiating SynMixer objects, which are the singleton
 * master controllers of all Subgroups and Channels in the Project.
 *
 */

(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynMixer', SynMixer);

SynMixer.$inject = ['SynSubgroup','SynProject'];

function SynMixer(SynSubgroup,SynProject) {

    /**
     * A pointer to the current SynMixer instance, so we can
     * stop any playback/timers when instantiating a new one
     *
     * @private
     */
    var mixer;

    /**
     *  * Creates an instance of SynMixer
     *
     * The MIXER manages the queuing, fading, and replacing
     * of cues according to global and cue-specific configs.
     * For each SUBGROUP, the Mixer maintains an array of CHANNELS
     * that handle individual cues. Each Channel can be assigned
     * only one cue at a time.
     *
     * @constructor
     * @this {SynMixer}
     */
    function Mixer() {


        /**
         * An array of EVERY Channel that exists in the Mixer
         * @type {Array}
         */
        this.channels = [];

        /**
         * A mapping of all the available Subgroups in the Mixer. By default
         * the reserved names "MUSIC_" and "COMMON_" are populated.
         * @type {Object}
         */
        this.subgroups = {
            MUSIC_ : new SynSubgroup('MUSIC_',this),
            COMMON_: new SynSubgroup('COMMON_',this),
        };

        // Global settings from the project
        var p = SynProject.getProject();
        var d = SynProject.getProjectDef();

        /**
         * The global default for fade-in time on new cues
         * (used only when fade-in is active)
         * @type {integer}
         */
        this.fadeInDuration = p.config.fadeInDuration || 2000;
        /**
         * The global default for fade-out time on new cues
         * (used in all cases of pausing/stopping playback)
         * @type {integer}
         */
        this.fadeOutDuration = p.config.fadeOutDuration || 2000;
        /**
         * A flag to identify whether the current Project is stored locally
         * or in the cloud, which has ramifications on how playback is handled.
         * @type {boolean}
         */
        this.isCloudProject = !!d.documentRoot.match('https?://');

        return this;
    }

    /**
     * Universal method to play a cue
     * (which essentially passes the command down
     * the line from Subgroup to Channel to Player)
     *
     * @param  {Cue} cue - the Cue object to be played
     * @return {SynChannel}
     */
    Mixer.prototype.play = function(cue) {
        // Return the channel on which it plays
        return this.queue(cue,true);
    };

    /**
     * @param  {Cue} cue - the Cue object to be queued
     * @param  {boolean} autoplay - whether to begin playback immediately
     * @return {SynChannel}
     */
    Mixer.prototype.queue = function(cue,autoplay) {

        var subname;

        // Is there a subgroup for this button?
        // TODO: migrate all cue JSON from 'group' to 'subgroup'
        if (cue.group) {

            // Normalize the subgroup names to avoid conflicts
            subname = cue.group.toLowerCase().replace('_','');

            // Does this subgroup need to be created?
            if (!this.subgroups.hasOwnProperty(subname)) {
                this.subgroups[subname] = new SynSubgroup(subname,this);
            }
        }
        // If not, use the common subgroup
        else {
            subname = 'COMMON_';
        }

        // Return the channel on which it plays
        return this.subgroups[subname].queue(cue,autoplay);
    };

    /**
     * Global method to stop playback on ALL Channels.
     * @return {undefined}
     */
    Mixer.prototype.stop = function() {

        // Iterate through the Subgroups and stop them all
        angular.forEach(this.subgroups, function(subgroup) {
            subgroup.stopExcept();
        });
    };

    /**
     * Flush the queue and playback all cues that are queued
     * @return {undefined}
     */
    Mixer.prototype.toggleLock = function() {

        // Iterate through the Channels and play any that are queued
        angular.forEach(this.channels, function(ch) {
            if (ch.is_queued) {
                ch.play();
            }
        });

    };


    return {
        createMixer: function() {

            // Clear out an existing mixer, if need be
            if (mixer) {
                mixer.stop();
            }

            mixer = new Mixer();
            return mixer;
        },
        getMixer: function() {
            return mixer;
        }
    };

}


// IIFE
})();
"use strict";

var _ = require('lodash');
var runsync = require('runsync');
var options = null;

function createCallback(patternsList, target) {

    return function(filename) {
        patternsList.forEach(function(pattern) {
            if (filename.match(new RegExp(pattern, 'gi'))) {
                target.push(filename);
            }
        });
    }
}

function filterFileTypes(filelist) {

    var filteredFiles = [];

    if (_.isObject(options) && ('patterns' in options)) {

        filelist.forEach(function(filepath) {

            options.patterns.files.forEach(function(fileType) {

                if (filepath.match(new RegExp(fileType, 'gi'))) {
                    filteredFiles.push(filepath);
                }

            });

        });
    } else {
        throw new Error('filterFileTypes: you should set patterns for filtering files');
    }

    return filteredFiles;
}

function filterFiles(filenames) {

    if (!Array.isArray(filenames)) {
        throw new Error('filterFiles: filenames must be an array');
    }

    var patterns = options.patterns || {};
    var filteredFilenames = [];

    filenames = filterFileTypes(filenames);

    if (filenames.length > 0) {

        var _exclude = [];
        var _include = [];
        var callbacks = [];

        if ('exclude' in patterns) {

            if ('paths' in patterns.exclude) {
                callbacks.push(createCallback(patterns.exclude.paths, _exclude));
            }

            if ('except' in patterns.exclude) {
                callbacks.push(createCallback(patterns.exclude.except, _include));
            }
        }

        filenames.forEach(function(filename) {
            callbacks.forEach(function(callback) {
                callback(filename);
            })
        });

        console.log("### excluded files: ", _exclude);
        console.log("### included files: ", _include);

        filteredFilenames = (_.difference(filenames, _exclude).concat(_include));

    }

    return filteredFilenames;

}

function getGitFileNames(options) {

    var output;
    var filenames = [];

    output = runsync.exec(options.command).toString();

    if (output.length > 0) {

        filenames = output.split('\n');

    }

    return filenames;

}

module.exports = function(grunt) {

    grunt.registerMultiTask("jscs-prepare", "Sily preparing files for JavaScript Code Style checker", function() {
        var done = this.async();
        var filenames;

        options = this.options();

        if (options.command) {
            filenames = getGitFileNames(options);
        } else {
            filenames = [options.src];
        }

        filenames = filterFiles(filenames);

        grunt.config.set('stagedFiles', filenames);

        if (filenames.length > 0) {
            grunt.log.ok("files for linting: ", filenames);
            done(options.force || grunt.task.run(options.nextStep));
        } else {
            grunt.log.errorlns("nothing to lint: exit");
            done(true);
        }

    });
};

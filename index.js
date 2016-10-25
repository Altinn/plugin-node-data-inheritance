var pluginName = 'plugin-node-data-inheritance';
var path = require('path');
var fs = require('fs-extra');
var glob = require('glob');

function getPatternByName (patternlab, patternName) {
  for (var i = 0; i < patternlab.patterns.length; i++) {
    if (patternlab.patterns[i].name === patternName) {
      return patternlab.patterns[i];
    }
  }

  return null;
}

function arrayReplaceRecursive (arr) {
  var i = 0
  var p = ''
  var argl = arguments.length
  var retObj

  if (argl < 2) {
    throw new Error('There should be at least 2 arguments passed to arrayReplaceRecursive()')
  }

  if (Object.prototype.toString.call(arr) === '[object Array]') {
    retObj = []
    for (p in arr) {
      retObj.push(arr[p])
    }
  } else {
    retObj = {}
    for (p in arr) {
      retObj[p] = arr[p]
    }
  }

  for (i = 1; i < argl; i++) {
    for (p in arguments[i]) {
      if (retObj[p] && typeof retObj[p] === 'object') {
        retObj[p] = arrayReplaceRecursive(retObj[p], arguments[i][p])
      } else {
        retObj[p] = arguments[i][p]
      }
    }
  }
  return retObj
}

function onPatternIterate (patternlab, pattern) {
  if (pattern.patternLineages) {
    for (var i = 0; i < pattern.patternLineages.length; i++) {
      var thePart = pattern.patternLineages[i].lineagePath.split('\\').pop().split('.')[0];
      var currentPattern = getPatternByName(patternlab, thePart);
      if (currentPattern) {
        onPatternIterate(patternlab, currentPattern);
        if (!pattern.jsonFileData) {
          pattern.jsonFileData = currentPattern.jsonFileData;
        } else {
          pattern.jsonFileData = arrayReplaceRecursive(currentPattern.jsonFileData, pattern.jsonFileData);
        }
      }
    }
  }
}

function registerEvents (patternlab) {
  patternlab.events.on('patternlab-pattern-before-data-merge', onPatternIterate);
}

function getPluginFrontendConfig () {
  return {
    'name': 'pattern-lab\/' + pluginName, 'templates': [],
    'stylesheets': [],
    'javascripts': ['patternlab-components\/pattern-lab\/' + pluginName +
      '\/js\/' + pluginName + '.js'],
    'onready': '', 'callback': ''
  }
}

function pluginInit (patternlab) {
  if (!patternlab) {
    console.error('patternlab object not provided to plugin-init');
    process.exit(1);
  }

  var pluginConfig = getPluginFrontendConfig();
  var pluginConfigPathName = path.resolve(patternlab.config.paths.public.root,
    'patternlab-components', 'packages');

  try {
    fs.outputFileSync(pluginConfigPathName + '/' + pluginName + '.json',
      JSON.stringify(pluginConfig, null, 2));
  } catch (ex) {
    console.trace(
      'plugin-node-tab: Error occurred while writing pluginFile configuration');
    console.log(ex);
  }

  if (!patternlab.plugins) {
    patternlab.plugins = []
  }

  patternlab.plugins.push(pluginConfig);
  var pluginFiles = glob.sync(__dirname + '/dist/**/*');
  if (pluginFiles && pluginFiles.length > 0) {

    for (var i = 0; i < pluginFiles.length; i++) {
      try {
        var fileStat = fs.statSync(pluginFiles[i]);
        if (fileStat.isFile()) {
          var relativePath = path.relative(__dirname, pluginFiles[i]).replace('dist', '');
          var writePath = path.join(patternlab.config.paths.public.root,
            'patternlab-components', 'pattern-lab', pluginName, relativePath);
          var tabJSFileContents = fs.readFileSync(pluginFiles[i], 'utf8');
          fs.outputFileSync(writePath, tabJSFileContents);
        }
      } catch (ex) {
        console.trace(
          'plugin-node-tab: Error occurred while copying pluginFile',
          pluginFiles[i]);
        console.log(ex);
      }
    }
  }

  registerEvents(patternlab); patternlab.config[pluginName] = true;
}

module.exports = pluginInit

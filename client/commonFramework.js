var common = window.common || { init: [] };


var BDDregex = new RegExp(
  '(expect(\\s+)?\\(.*\\;)|' +
  '(assert(\\s+)?\\(.*\\;)|' +
  '(assert\\.\\w.*\\;)|' +
  '(.*\\.should\\..*\\;)/'
);

var libraryIncludes =
  "<link rel='stylesheet' href='//cdnjs.cloudflare.com/ajax/" +
  "libs/animate.css/3.2.0/animate.min.css'/>" +
  "<link rel='stylesheet' href='//maxcdn.bootstrapcdn.com/" +
  "bootstrap/3.3.1/css/bootstrap.min.css'/>" +
  "<link rel='stylesheet' href='//maxcdn.bootstrapcdn.com/" +
  "font-awesome/4.2.0/css/font-awesome.min.css'/>" +
  '<style>body { padding: 0px 3px 0px 3px; }</style>';

var iFrameScript = "<script src='/js/iFrameScripts.js'></script>";

function workerError(error) {
  var display = $('.runTimeError');
  var housing = $('#testSuite');

  if (display.html() === error) {
    return null;
  }

  display.remove();

  housing.prepend(`
    <div class="runTimeError" style="font-size: 18px;">
      <code>
        ${common.unScopeJQuery(error)}
      </code>
    </div>
  `);

  display.hide().fadeIn(function() {
    setTimeout(function() {
      display.fadeOut(function() {
        display.remove();
      });
    }, 1000);
  });
}

common.safeHTMLRun = function safeHTMLRun(shouldTest) {
  const codeStorage = common.codeStorage;
  if (common.challengeType !== '0') {
    return null;
  }

  const editorValue = common.editor.getValue();
  const previewFrame = document.getElementById('preview');
  const preview = previewFrame.contentDocument ||
    previewFrame.contentWindow.document;

  if (!editorValue.match(/\<script\>/gi)) {
    preview.open();
    preview.write(
      libraryIncludes + editorValue + (shouldTest ? iFrameScript : '')
    );
    codeStorage.updateStorage();
    preview.close();
    return null;
  }

  // grab user javaScript
  var s = editorValue
    .split(/\<\s?script\s?\>/gi)[1]
    .split(/\<\s?\/\s?script\s?\>/gi)[0];

  // need to add jQuery here
  s = `
    document = {};
    var navigator = function() {
      this.geolocation = function() {
        this.getCurrentPosition = function() {
          this.coords = {latitude: "", longitude: ""};
          return this;
        };
        return this;
      };
      return this;
    };
    ${s}
  `;

  return common.detectLoop(s, function(cls, message) {
    if (cls) {
      console.log(message.error);
      workerError(message.error);
    }

    preview.open();
    preview.write(
      libraryIncludes + editorValue + (shouldTest ? iFrameScript : '')
    );
    codeStorage.updateStorage();
    preview.close();
  });
};

common.updatePreview = function updatePreview() {
  var editorValue = common.editor.getValue();
  var openingComments = editorValue.match(/\<\!\-\-/gi);
  var closingComments = editorValue.match(/\-\-\>/gi);
  if (
    openingComments &&
    (
      !closingComments ||
      openingComments.length > closingComments.length
    )
  ) {
    common.editor.setValue(editorValue + '-->');
    editorValue = editorValue + '-->';
  }


  if (!editorValue.match(/\$\s*?\(\s*?\$\s*?\)/gi)) {
    common.safeHTMLRun(false);
  } else {
    workerError('Unsafe $($)');
  }
};

common.init.push(() => {
  if (common.challengeType === '0') {
    common.updatePreview(false);
  }
});


/* eslint-disable no-unused-vars */
var testResults = [];
var postSuccess = function(data) {
/* eslint-enable no-unused-vars */

  var testDoc = document.createElement('div');
  $(testDoc).html(`
    <div class='row'>
      <div class='col-xs-2 text-center'>
      <i class='ion-checkmark-circled big-success-icon'></i>
    </div>
    <div class='col-xs-10 test-output test-vertical-center wrappable'>
      ${JSON.parse(data)}
    </div>
  `);

  $('#testSuite').append(testDoc);

  testSuccess();
};

/* eslint-disable no-unused-vars */
var postError = function(data) {
/* eslint-enable no-unused-vars */
  var testDoc = document.createElement('div');

  $(testDoc).html(`
    <div class='row'>
      <div class='col-xs-2 text-center'>
      <i class='ion-close-circled big-error-icon'></i>
    </div>
    <div class='col-xs-10 test-vertical-center test-output wrappable'>
      ${JSON.parse(data)}
    </div>
  `);

  $('#testSuite').append(testDoc);
};

var goodTests = 0;
var testSuccess = function() {
  goodTests++;
  // test successful run show completion
  if (goodTests === common.tests.length) {
    return showCompletion();
  }
};

function ctrlEnterClickHandler(e) {
  // ctrl + enter or cmd + enter
  if (
    e.metaKey && e.keyCode === 13 ||
    e.ctrlKey && e.keyCode === 13
  ) {
    $('#complete-courseware-dialog').off('keydown', ctrlEnterClickHandler);
    if ($('#submit-challenge').length > 0) {
      $('#submit-challenge').click();
    } else {
      window.location = '/challenges/next-challenge?id=' + common.challengeId;
    }
  }
}

function showCompletion() {
  var time = Math.floor(Date.now()) - window.started;

  window.ga(
    'send',
    'event',
    'Challenge',
    'solved',
    common.challengeName + ', Time: ' + time + ', Attempts: ' + 0
  );

  var bonfireSolution = common.editor.getValue();
  var didCompleteWith = $('#completed-with').val() || null;

  $('#complete-courseware-dialog').modal('show');
  $('#complete-courseware-dialog .modal-header').click();

  $('#submit-challenge').click(function(e) {
    e.preventDefault();

    $('#submit-challenge')
      .attr('disabled', 'true')
      .removeClass('btn-primary')
      .addClass('btn-warning disabled');

    var $checkmarkContainer = $('#checkmark-container');
    $checkmarkContainer.css({ height: $checkmarkContainer.innerHeight() });

    $('#challenge-checkmark')
      .addClass('zoomOutUp')
      // .removeClass('zoomInDown')
      .delay(1000)
      .queue(function(next) {
        $(this).replaceWith(
          '<div id="challenge-spinner" ' +
          'class="animated zoomInUp inner-circles-loader">' +
          'submitting...</div>'
        );
        next();
      });

    $.post(
      '/completed-bonfire/', {
        challengeInfo: {
          challengeId: common.challengeId,
          challengeName: common.challengeName,
          completedWith: didCompleteWith,
          challengeType: common.challengeType,
          solution: bonfireSolution
        }
      },
      function(res) {
        if (res) {
          window.location =
            '/challenges/next-challenge?id=' + common.challengeId;
        }
      }
    );
  });
}

common.resetEditor = function resetEditor() {
  common.editor.setValue(common.replaceSafeTags(common.seed));
  $('#testSuite').empty();
  common.executeChallenge(true);
  common.codeStorage.updateStorage();
};


common.addTestsToString = function(userJavaScript, userTests = []) {

  // insert tests from mongo
  for (var i = 0; i < common.tests.length; i++) {
    userJavaScript += '\n' + common.tests[i];
  }

  var counter = 0;
  var match = BDDregex.exec(userJavaScript);

  while (match) {
    var replacement = '//' + counter + common.salt;
    userJavaScript = userJavaScript.substring(0, match.index) +
      replacement +
      userJavaScript.substring(match.index + match[0].length);

    userTests.push({
      'text': match[0],
      'line': counter,
      'err': null
    });

    counter++;
    match = BDDregex.exec(userJavaScript);
  }

  return userJavaScript;
};

common.init($ => {
  $('#submitButton').on('click', function() {
    common.executeChallenge(true);
  });
});

$(document).ready(function() {

  common.init.forEach(function(init) {
    init($);
  });

  // init modal keybindings on open
  $('#complete-courseware-dialog').on('shown.bs.modal', function() {
    $('#complete-courseware-dialog').keydown(ctrlEnterClickHandler);
  });

  // remove modal keybinds on close
  $('#complete-courseware-dialog').on('hidden.bs.modal', function() {
    $('#complete-courseware-dialog').off('keydown', ctrlEnterClickHandler);
  });

  var $preview = $('#preview');
  if (typeof $preview.html() !== 'undefined') {
    $preview.load(function() {
      common.executeChallenge(true);
    });
  } else if (
    common.challengeType !== '2' &&
    common.challengeType !== '3' &&
    common.challengeType !== '4' &&
    common.challengeType !== '7'
  ) {
    common.executeChallenge(true);
  }

});

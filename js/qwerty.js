// Lifted from Qwerty Steno.

// Functions that must be implemented
//  function showAnswerPrompt(steno) {}
//  function setStenoKeyboardPressedKeys() {}
//  function clearStenoKeyboardPressed() {}
//  function hideAnswerPrompt() {}
//  function showWpm() {}
//  function setNextDrillItem(steno) {}
//  function possibleAnswerClick() {}
//  function showDrillItem() {}
//
// HTML IDs that must be implemented
//  #chkPlainTextInput
//  #txtInput

var currentTdAnswer = 0;
var itemsAnswered = 0;
var keysUp = [], keysDown = [];
var currentDrillItem;
var answerGivenSoFar = "";
var currentStroke = 1;

function correctAnswer(answer) {
    if (jQuery('#chkPlainTextInput').is(':checked')) {

        // Plain text mode
        var text = currentDrillItem.Text;

        if (text.toLowerCase() == answer.toLowerCase()) {

            return 0;
        }
    }
    else {
        // Steno mode
        var correctAnswersString = currentDrillItem.Value;

        var correctAnswersArray = correctAnswersString.split(",");

        for (var i = 0; i < correctAnswersArray.length; i++) {

            // If this possible answer starts with the same strokes as the user has given
            if (correctAnswersArray[i].indexOf(answerGivenSoFar) == 0) {

                var strokes = correctAnswersArray[i].split("/");

                var correctStroke = strokes[currentStroke - 1];

                if (answer == correctStroke) {

                    // Correct stroke
                    answerGivenSoFar += answer + "/"

                    var strokesRemaining = strokes.length - currentStroke;

                    return strokesRemaining;
                }
            }
        }
    }

    // Not a correct stroke
    return -1;
}

function getMiddleLettersFromSteno(steno) {
    var index = steno.indexOf("-");

    if (index >= 0) {
        // no vowels
        return "";
    }
    var r = "";

    if (steno.indexOf("A") >= 0) {
        r += "A";
    }

    if (steno.indexOf("O") >= 0) {
        r += "O";
    }

    if (steno.indexOf("*") >= 0) {
        r += "*";
    }

    if (steno.indexOf("E") >= 0) {
        r += "E";
    }

    if (steno.indexOf("U") >= 0) {
        r += "U";
    }
    return r;
}

function getLeftLettersFromSteno(steno) {
    
    var index = steno.indexOf("-");

    if (index >= 0) {
        
        // Found
        return steno.substring(0, index);
    }

    index = steno.indexOf("A");

    if (index >= 0) {
        
        // Found
        return steno.substring(0, index);
    }

    index = steno.indexOf("O");

    if (index >= 0) {
        
        // Found
        return steno.substring(0, index);
    }

    index = steno.indexOf("*");

    if (index >= 0) {
        
        // Found
        return steno.substring(0, index);
    }

    index = steno.indexOf("E");

    if (index >= 0) {
        
        // Found
        return steno.substring(0, index);
    }
    
    index = steno.indexOf("U");

    if (index >= 0) {
        
        // Found
        return steno.substring(0, index);
    }

    return steno;
}

function getRightLettersFromSteno(steno) {
    
    var index = steno.indexOf("-");

    if (index >= 0) {
        
        // Found
        return steno.substring(index + 1);
    }

    index = steno.indexOf("U");

    if (index >= 0) {
        
        // Found
        return steno.substring(index + 1);
    }

    index = steno.indexOf("E");

    if (index >= 0) {
        
        // Found
        return steno.substring(index + 1);
    }

    index = steno.indexOf("*");

    if (index >= 0) {
        
        // Found
        return steno.substring(index + 1);
    }

    index = steno.indexOf("O");

    if (index >= 0) {
        
        // Found
        return steno.substring(index + 1);
    }

    index = steno.indexOf("A");

    if (index >= 0) {
        
        // Found
        return steno.substring(index + 1);
    }

    return "";
}

function clearKeys() {
    
    keysDown = [];
    keysUp = [];
}

function addKeyDown(letter) {

    if (letter != null) {

        if (jQuery.inArray(letter, keysDown) == -1) {

            keysDown.push(letter);

            setStenoKeyboardPressedKeys(keysDown);
        }
    }
}

function addKeyUp(letter) {

    if (letter != null) {

        if (jQuery.inArray(letter, keysUp) == -1) {

            keysUp.push(letter);
        }
    }
}

function getStenoFromLetterArray(letters) {

    var leftLetters = [];
    var rightLetters = [];
    var middleLetters = [];

    for (var i = 0; i < letters.length; i++) {

        var singleLetter = letters[i];

        var indexOfDash = singleLetter.indexOf("-");

        if (indexOfDash == 0) {

            // Key is on the right
            rightLetters.push(singleLetter[1]);
        }
        else if (indexOfDash == 1) {

            // Key is on the left
            leftLetters.push(singleLetter[0]);
        }
        else if (singleLetter == '#') {

            // Number Bar
            leftLetters.push(singleLetter);
        }
        else {
            // Middle key
            middleLetters.push(singleLetter);
        }
    }

    if (middleLetters.length == 0 && rightLetters.length > 0) {

        middleLetters.push("-");
    }

    var leftString = "";
    var rightString = "";
    var middleString = "";

    leftString = orderLeftStenoLetters(leftLetters);
    rightString = orderRightStenoLetters(rightLetters);
    middleString = orderMiddleStenoLetters(middleLetters);

    return leftString + middleString + rightString;
}

function orderLeftStenoLetters(leftLetters) {

    var result = "";

    result += getLetterFromArray("#", leftLetters);
    result += getLetterFromArray("S", leftLetters);
    result += getLetterFromArray("T", leftLetters);
    result += getLetterFromArray("K", leftLetters);
    result += getLetterFromArray("P", leftLetters);
    result += getLetterFromArray("W", leftLetters);
    result += getLetterFromArray("H", leftLetters);
    result += getLetterFromArray("R", leftLetters);

    return result;
}

function orderRightStenoLetters(rightLetters) {

    var result = "";

    result += getLetterFromArray("F", rightLetters);
    result += getLetterFromArray("R", rightLetters);
    result += getLetterFromArray("P", rightLetters);
    result += getLetterFromArray("B", rightLetters);
    result += getLetterFromArray("L", rightLetters);
    result += getLetterFromArray("G", rightLetters);
    result += getLetterFromArray("T", rightLetters);
    result += getLetterFromArray("S", rightLetters);
    result += getLetterFromArray("D", rightLetters);
    result += getLetterFromArray("Z", rightLetters);

    return result;
}

function orderMiddleStenoLetters(middleLetters) {

    var result = "";

    result += getLetterFromArray("A", middleLetters);
    result += getLetterFromArray("O", middleLetters);
    result += getLetterFromArray("*", middleLetters);
    result += getLetterFromArray("E", middleLetters);
    result += getLetterFromArray("U", middleLetters);
    result += getLetterFromArray("-", middleLetters);

    return result;
}

function getLetterFromArray(singleLetter, letterArray) {

    var result = "";

    if (jQuery.inArray(singleLetter, letterArray) > -1) {

        result += singleLetter;
    }

    return result;
}

function getStenoLetter(keyCode) {

    var result = null;

    if (keyCode == 65 || keyCode == 81) {

        result = "S-";
    }
    else if (keyCode == 87) {

        result = "T-";
    }
    else if (keyCode == 83) {

        result = "K-";
    }
    else if (keyCode == 69) {

        result = "P-";
    }
    else if (keyCode == 68) {

        result = "W-";
    }
    else if (keyCode == 82) {

        result = "H-";
    }
    else if (keyCode == 70) {

        result = "R-";
    }
    else if (keyCode == 84 || keyCode == 89 || keyCode == 71 || keyCode == 72) {

        result = "*";
    }
    else if (keyCode == 67) {

        result = "A";
    }
    else if (keyCode == 86) {

        result = "O";
    }
    else if (keyCode == 78) {

        result = "E";
    }
    else if (keyCode == 77) {

        result = "U";
    }
    else if (keyCode == 85) {

        result = "-F";
    }
    else if (keyCode == 74) {

        result = "-R";
    }
    else if (keyCode == 73) {

        result = "-P";
    }
    else if (keyCode == 75) {

        result = "-B";
    }
    else if (keyCode == 79) {

        result = "-L";
    }
    else if (keyCode == 76) {

        result = "-G";
    }
    else if (keyCode == 80) {

        result = "-T";
    }
    else if (keyCode == 186 || keyCode == 59) {

        result = "-S";
    }
    else if (keyCode == 219) {

        result = "-D";
    }
    else if (keyCode == 192 || keyCode == 222) {

        result = "-Z";
    }
    else if (keyCode >= 48 && keyCode <= 57) {

        result = "#";
    }
    else if (keyCode == 189) {

        result = "#";
    }

    return result;
}

function keyDown(event) {

    if (jQuery('#chkPlainTextInput').is(':checked')) {
        
        // Plain text mode
    }
    else {
        // Steno mode
        event.preventDefault();

        addKeyDown(getStenoLetter(event.keyCode));
    }
}

function keyUp(event) {

    if (jQuery('#chkPlainTextInput').is(':checked')) {

        // Plain text mode
        var text = jQuery('#txtInput').val();

        text = jQuery.trim(text);

        var remainingStrokes = correctAnswer(text);

        if (remainingStrokes == 0) {

            // Correct
            // Entire answer complete, no more remaining strokes
            itemsAnswered++;

            hideAnswerPrompt();

            showWpm();

            setNextDrillItem();

            showDrillItem();

            jQuery('#txtInput').val('');
        }
    }
    else {
        event.preventDefault();

        addKeyUp(getStenoLetter(event.keyCode));

        if (keysUp.length == keysDown.length) {

            // All keys up
            clearStenoKeyboardPressed();

            var steno = getStenoFromLetterArray(keysDown);

            if (steno != "") {

                if (steno != "*") {

                    var remainingStrokes = correctAnswer(steno);

                    if (remainingStrokes == 0) {

                        // Correct stroke
                        // Entire answer complete, no more remaining strokes
                        itemsAnswered++;

                        hideAnswerPrompt();

                        showWpm();

                        setNextDrillItem(steno); // XXX NEW XXX

                        showDrillItem();
                    }
                    else if (remainingStrokes > 0) {

                        // Correct stroke
                        // There are more strokes remaining
                        currentStroke++;

                        jQuery('#txtInput').val(answerGivenSoFar);

                        possibleAnswerClick(currentTdAnswer + 1);
                    }
                    else {
                        // Incorrect stroke
                        showAnswerPrompt(steno);
                    }
                }
                else {
                    // Asterisk key
                    // Delete last stroke
                    if (answerGivenSoFar.length > 0) {

                        currentStroke--;

                        var answerSoFarWithoutSlash = answerGivenSoFar.substring(answerGivenSoFar.length - 1, 1);

                        var indexOfLastSlash = answerSoFarWithoutSlash.lastIndexOf("/");

                        if (indexOfLastSlash < 0) {
                            answerGivenSoFar = "";
                        }
                        else {
                            answerGivenSoFar = answerSoFarWithoutSlash.substring(0, indexOfLastSlash);
                        }

                        jQuery('#txtInput').val(answerGivenSoFar);

                        possibleAnswerClick(currentTdAnswer + 1);
                    } else {
                        if (cur_mode == "speed") {
                            prevWord(); // XXX NEW XXX
                        }
                    }
                }
            }

            clearKeys();
        }
    }
}

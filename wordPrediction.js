/**
* Add listeners to textareas, input fields, and content-editable elements
*/
$(document).ready(function() {
   EditableAreaUtility.addListeners('[contenteditable=true]');
   EditableAreaUtility.addListeners('textarea[data-wordprediction="1"]');
   EditableAreaUtility.addListeners('input[data-wordprediction="1"]');
   EditableAreaUtility.inputFieldListener();
});

document.addEventListener("DOMContentLoaded", function() {
    EditableAreaUtility.wordPredictionInitialize();
});

/**
* Select a word from drop down
*/
document.addEventListener('click', function(event) {
    if (event.target && "wordPredictionChoices" === event.target.className){
        DropDownOptions.selectChoice(event);
    } else if (
        "wordPredictionChoices" !== event.target.className 
        || 1 === event.target.dataset.wordprediction
    ) {
        DropDownOptions.removeDropDown();
    }
});

/**
* Press enter to select word choice
*/
document.addEventListener('keydown',function(event) { 
    if (13 === event.keyCode && $(".wordPredictionChoices").is(":focus")) {
        DropDownOptions.selectChoice(event);
    }
});

/**
* Hover over word selection
*/
document.addEventListener('mouseover', function(event){
    if (event.target && "wordPredictionChoices" === event.target.className){
          event.target.style.backgroundColor = '#cccccc';
    }
});

/**
* Move away from word selection
*/
document.addEventListener('mouseout', function(event) {
    if (event.target && "wordPredictionChoices" === event.target.className){
          event.target.style.backgroundColor = '#ffffff';
    }
});

/**
* Save input field text
*/
document.addEventListener("click", function(event) {
    EditableAreaUtility.prepareToSaveInputText(
        EditableAreaUtility.conditionOnSavingInputTextOnClick(event)
    ); 
}); 

/**
* Generic string of sentences, phrases, consecutive words used in English, etc...
*/
var Template = { 
    /**
    * Format strictly enforced (if not very first word): 
    * space [your text].space
    * e.g. I am cool. Hello world. 
    */
    corpus: "please let me know if you have any questions. Please see attached."
};

var EditableAreaUtility = {
    /**
    * Configurations for the type of WYZIWYG editor used
    */
    wyziwygTypeConfigurations: {
        wyziwygWrapperClassName: '.note-editor', // wyziwyg editor wrapper class (parent, afrer hidden textarea)
        emptyValue: '<p><br></p>', // value when empty
    },
    
    /**
    * Run word prediction
    * only for IE11, Edge, Chrome, and FireFox
    * Not tested for Safari
    */
    wordPredictionInitialize: function () {
        if (-1 === navigator.userAgent.indexOf("MSIE")) {
            /**
            * Setup data store variables
            */
            window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
            window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
            
            /**
            * Check for compatibility
            */
            if (!window.indexedDB) {    
		        console.log(BROWSER_INCOMPATIBLE);
                    
                return false;
            }
            
            /**
            * Process corpus
            */
            WordPredictions.init();
        }
    },
    
    /**
    * Add listeners to elements
    */
    addListeners: function (flag) {
       var editableElements = document.querySelectorAll(flag);
       for (i = 0; i < editableElements.length; ++i) {
            editableElements[i].addEventListener("keyup", function(event) {
                EditableAreaUtility.onSpace(event);              
                EditableAreaUtility.onChar(event);
                EditableAreaUtility.onSpell(event);                
            });  
            
            editableElements[i].addEventListener("keydown", function(event) {
               if (true === !!window.MSInputMethodContext && !!document.documentMode) {
                    EditableAreaUtility.ignorePredictionWithSpacebar(event);    
               }
           });  
        }
    },
    
    /**
    * Primarily for contenteditable in IE11 (e.g. summernote)
    * If a prediction is highlighted and user clicks spacebar,
    * then remove highlighted text, and instead add a space
    */
    ignorePredictionWithSpacebar: function (event) {
        if (
            (
                (32 === event.keyCode && "" !== InputUtility.contentEditable) 
                || (true === InputUtility.predictionOn && 8 === event.keyCode)
            )
        ) {              
            var elem = $(event.target).closest(EditableAreaUtility.wyziwygTypeConfigurations.wyziwygWrapperClassName).prev();
            if (typeof elem !== "undefined" && "TEXTAREA" === elem.prop('tagName')) {
                if (32 === event.keyCode) {
                    EditableAreaUtility.updateWyziwygWithPreviousText(elem);
                }
                var sel = window.getSelection();                
                if (sel.getRangeAt && sel.rangeCount) {
                    var range = sel.getRangeAt(0);
                    sel.removeAllRanges(); 
                    InputUtility.moveCursorToEnd(event);
                    InputUtility.contentEditable = '';                   
                }
            }
       }  
    },
    
    /**
    * Add how you would populate your WYZIWYG editor here.
    */
    updateWyziwygWithPreviousText: function (elem) {
         elem.summernote('code', InputUtility.contentEditable);
    },
    
    /**
    * Start spell prediction by default
    */
    onSpell: function (event) {
        InputUtility.init(event, 'spell');
    },
    
    /**
    * Start char prediction from condition
    */
    onChar: function (event) {
        if (true === MakePrediction.captureChars) {
            InputUtility.init(event, 'char');
        }
    },
    
    /**
    * Start word prediction from condition
    */
    onSpace: function (event) {
        if (event.keyCode === 32) {
            DropDownOptions.removeDropDown();
            MakePrediction.clearCharData();
            InputUtility.init(event, 'word');
        }
    },
    
    /**
    * Condition to initiate save input text on click
    */
    conditionOnSavingInputTextOnClick: function (event) {
        return (
            "" !== InputUtility.inputElement 
            && InputUtility.inputElement !== event.target 
            && "wordPredictionChoices" !== event.target.className
        )
    },
    
    /**
    * Condition to initiate save input text on focus
    */
    conditionOnSavingInputTextOnFocus: function (event) {
        return (
            "" !== InputUtility.inputElement 
            && InputUtility.inputElement !== event.target
        );
    },
    
    /**
    * Determine if input text save to corpus
    */
    prepareToSaveInputText: function (condition) {
        if (condition) {
            var textString = InputUtility.inputElement.value;
            if (textString.replace(/\s/g, '').length) {
                var lastWordTyped = "."; // Period forces a save
                InputUtility.updateCorpus(lastWordTyped, textString);
            } 
            
            if ('INPUT' === event.target.nodeName) {
                InputUtility.inputElement = event.target;
            } else {
                InputUtility.inputElement = '';
            }
        } else {
            if ('INPUT' === event.target.nodeName) {
                InputUtility.inputElement = event.target;
            }
        }
    },
    
    /**
    * Add listener to all input fields with data attribute
    */
    inputFieldListener: function () {
        var eachWordPrediction = document.querySelectorAll('[data-wordprediction="1"]');
        if (eachWordPrediction) {
            for (var i = 0; i < eachWordPrediction.length; i++) {
		        eachWordPrediction[i].addEventListener("focus", function(event) {
		            EditableAreaUtility.prepareToSaveInputText(
		                EditableAreaUtility.conditionOnSavingInputTextOnFocus(event)
		            );
		        }); 
	        }
        }
    }
};

var DropDownOptions = {
    /**
    * Start dropdown option
    */
    initializeDropdown: function (event) {
        if ("INPUT" === event.target.nodeName && "password" !== event.target.type) {
            DropDownOptions.createDropDown(event.target);
        }
    },
    
    /**
    * Create the dropdown list of words
    */
    createDropDown: function (elem) {
        var ul = document.querySelector("#wordPrediction"); 
        if (!ul) {
            var rect                         = elem.getBoundingClientRect();
            ul                               = document.createElement('ul');
            ul.id                            = 'wordPrediction';
            ul.style.listStyle               = 'none';
            ul.style.position                = 'absolute';
            ul.style.zIndex                  = 1;
            ul.style.backgroundColor         = '#ffffff';
            ul.style.padding                 = '5px';
            ul.style.borderBottom            = 'solid 1px #cccccc';
            ul.style.borderLeft              = 'solid 1px #cccccc';
            ul.style.borderRight             = 'solid 1px #cccccc';
            ul.style.borderBottomRightRadius = '5px';
            ul.style.borderBottomLeftRadius  = '5px';
            ul.style.display                 = 'none';
            ul.style.fontSize                = '80%';
            ul.style.cursor                  = 'pointer';
            ul.style.left                    = rect.left;
            elem.parentNode.insertBefore(ul, elem.nextSibling);
        }
    },
    
    /**
    * Add word options to drop down list
    */
    populateDropDown: function (dataArray) {
        var wordString = '';
        var ul         = document.querySelector("#wordPrediction"); 
        if (ul) {
            ul.innerHTML = "";
            dataArray.sort();
            for (var i = 0; i < dataArray.length; i++) {
                wordString += '<li ' +
                              'tabindex="0" ' +
                              'style="padding: 2px;" ' +
                              'class="wordPredictionChoices">' + 
                              dataArray[i] + 
                              '</li>';
                
            } 
            
            ul.style.display = 'inherit';
            ul.innerHTML     = wordString;
            
            if ("" === wordString) {
                ul.style.display = 'none';
            }
        }
    },
    
    /**
    * Get selected word from drop down
    */
    selectChoice: function (event) {
        var input = $("#wordPrediction").closest("div").find("input");
        if (input.length > 0) {
            var inputValue    = $(input).val();
            var inputArray    = inputValue.split(" ");
            var lastWord      = inputArray[inputArray.length - 1];
    
            DropDownOptions.applyChoiceToInputField(event, inputValue, input, lastWord);
        }
    },
    
    /**
    * Add selected word to input field
    */
    applyChoiceToInputField: function (event, inputValue, input, lastWord) {
        var replacementWord = DropDownOptions.checkCapitalization(lastWord, event.target.innerHTML);
        inputValue          = inputValue.replace(new RegExp(lastWord + '$'), replacementWord);
        $(input).val(inputValue);
        DropDownOptions.removeDropDown();
        $(input).focus();
    },
    
    /**
    * Determine if capitalized or not
    */
    checkCapitalization: function (lastWord, replacementWord) {
        if (lastWord.charAt(0) === lastWord.charAt(0).toUpperCase()) {
            return replacementWord.charAt(0).toUpperCase() + replacementWord.slice(1);
        }
        
        return replacementWord;
    },
    
    /**
    * Remove drop down
    */
    removeDropDown: function () {
        var wordPrediction = document.querySelector('#wordPrediction');
        if (wordPrediction) {
            // IE compatibility
            if (!('remove' in Element.prototype)) {
                Element.prototype.remove = function() {
                    if (this.parentNode) {
                        this.parentNode.removeChild(this);
                    }
                };
            }
            wordPrediction.remove();
        }
    }
};

/**
* Start prediction and populate the result
*/
var InputUtility = {
    // Global to confirm no duplicate results
    previouslySavedSentence: "",
    wordGuess: "",
    contentEditable: "",
    predictionOn: false,
    inputElement: '',
    
    /**
    * For contentEditable in IE11
    * Manually removes high lighted word
    */
    removeHighlightedOnBackspace: function (event) {
        if (8 === event.keyCode) {
            if (null !== event.target.innerHTML.match(/(?:\s|^)([\S]+)$/i)) {
                var lastWordPosition    = event.target.innerHTML.match(/(?:\s|^)([\S]+)$/i).index;
                var newText             = event.target.innerHTML.substring(0, lastWordPosition);
                var contentEditableText = ("" === newText) ? EditableAreaUtility.wyziwygTypeConfigurations.emptyValue : newText + "</p>";
                var elem                = $(event.target).closest(EditableAreaUtility.wyziwygTypeConfigurations.wyziwygWrapperClassName).prev();
                elem.summernote('code', contentEditableText);
             }
        }
    },
    
    /**
    * For contentEditable in IE11
    * Manually repositions cursor in correct place
    */
    moveCursorToEnd: function(event) {  
        InputUtility.removeHighlightedOnBackspace();
        var contentEditable = event.target;
        var range           = document.createRange();
        var sel             = window.getSelection();
        var childLength     = contentEditable.childNodes.length;
        
        if (childLength > 0) { 
            var lastNode = contentEditable.childNodes[childLength - 1];
            if (32 === event.keyCode) {
                var lastNodeChildren = lastNode.childNodes.length - 1;
                if (-1 !== lastNodeChildren) {
                    range.setStart(lastNode, lastNodeChildren);
                }
            } else {
                var lastNodeChildren = lastNode.childNodes.length;
                range.setStartAfter(lastNode);
            }

            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            InputUtility.predictionOn = false;   
        }
        
        return this;
    },
    
    /**
    * Start word prediction when a space is typed
    */   
    init: function (event, flag) {
        try {
            InputUtility.contentEditable = '';
            DropDownOptions.initializeDropdown(event);
            var textString = InputUtility.getString(event);
            if (null !== textString && "password" !== event.target.type) {
               InputUtility.initializeWordPrediction(textString, event, flag);
               if (true === InputUtility.checkForTrailingSpaces(textString)) {
                   InputUtility.initializeCharPrediction(textString, event, flag); 
                   InputUtility.initializeSpellPrediction(textString, event, flag);  
               }
            }
        } catch (error) {
             console.log(error);
        }
    },
    
    /**
    * Start to predict by letter
    */
    initializeSpellPrediction: function (textString, event, flag) {
        if ("spell" === flag) {
            var result = InputUtility.getNextLetterForSpellCheck(event, textString);
            if ("" !== result) {
                if ("." === result[result.length-1]) {
                    result = result.slice(0, -1);
                }
                InputUtility.populatePrediction(result, textString, event);
            }
        }
    },
    
    /**
    * Check for spaces
    * cross browser compatibility required
    */
    checkForTrailingSpaces: function (textString) {
       var canRunCharAndSpell = false;
       var sel                = window.getSelection();

       if (
            null !== sel.anchorNode 
            && typeof sel.anchorNode.data !== "undefined" 
            && false === /\s+/.test(sel.anchorNode.data.substr(-1)) 
            && " " !== sel.anchorNode.data.substr(-1)
       ) {
            canRunCharAndSpell = true;
       } else if (false === /\s+/.test(textString.substr(-1))) {
            canRunCharAndSpell = true;
       }
       
       return canRunCharAndSpell;
    },
    
    /**
    * Predict next letter
    */
    getNextLetterForSpellCheck: function (event, textString) {
        var result = '';
        
        if (String.fromCharCode(event.keyCode).match(/(\w|\s)/g)) {          
           textString          = textString.replace(/^\s+|\s+$/g, '');
           var typedWordsArray = textString.split(" ");
           var wordInUse       = typedWordsArray[typedWordsArray.length - 1];
           var letterCount     = wordInUse.length;
           
           for (var key in WordPredictions.wordDictionaryObj) {
                if (WordPredictions.wordDictionaryObj.hasOwnProperty(key)) {
                    if ("" !== wordInUse && wordInUse.toLowerCase() === key.toLowerCase().substring(0, letterCount)) {
                        result = key.substring(letterCount);
                        break;
                    }
                }
           }
           InputUtility.saveOtherChoices(letterCount, wordInUse);
        }
        
        return result;
    },
    
    /**
    * Create object of all other choices
    */
    saveOtherChoices: function (letterCount, wordInUse) {
        var wordChoiceArray  = [];
        
        for (var key in WordPredictions.wordDictionaryObj) {
            if (WordPredictions.wordDictionaryObj.hasOwnProperty(key)) {
                if ("" !== wordInUse && wordInUse.toLowerCase() === key.toLowerCase().substring(0, letterCount)) {   
                    if (wordChoiceArray.indexOf(InputUtility.removePeriodAndMakeLowercase(key)) === -1) {
                        wordChoiceArray.push(InputUtility.removePeriodAndMakeLowercase(key));
                    }
                }
            }
       }       

       DropDownOptions.populateDropDown(wordChoiceArray);
    },
    
    /**
    * Remove last period and make word lowercase
    */
    removePeriodAndMakeLowercase: function (key) {
        return key.replace(/\.$/, "").toLowerCase()
    },
    
    /**
    * For multiple weighted next words from a single typed word,
    * predict the next word based on each character typed
    */
    initializeCharPrediction: function (textString, event, flag) {
        if ("char" === flag) {
            if (String.fromCharCode(event.keyCode).match(/(\w|\s)/g)) {
               var letter = String.fromCharCode(event.keyCode).toLowerCase();
               InputUtility.getWordBasedOnLetter(letter, textString, event);
            } else {
                MakePrediction.clearCharData();
            }
        }
    },
    
    /**
    * Get a word based on letters typed in sequence
    */
    getWordBasedOnLetter: function (letter, textString, event) {
        if (true === MakePrediction.captureChars && "" !== letter.trim()) {
            var wordBuild            = MakePrediction.wordBuild + letter;
            MakePrediction.wordBuild = wordBuild.trim();
            var letterCount          = MakePrediction.wordBuild.length;
            var predictionArray      = [];
            
            MakePrediction.otherPredictions.map(function (value, index) {
                var matchLetters = value.slice(0, letterCount);
                if (matchLetters === MakePrediction.wordBuild) {
                    predictionArray.push(value);
                }
            });
              
            if (typeof predictionArray[0] !== "undefined") {
                var partialWord = predictionArray[0].slice(letterCount, predictionArray[0].length);
                InputUtility.populatePrediction(partialWord, textString, event);
            }
        }
    },
    
    /**
    * Start word prediction
    */
    initializeWordPrediction: function (textString, event, flag) {
        if ("word" === flag && "" !== textString.trim() && /\s+/.test(textString.slice(-1))) {         
            var dualSpaceCheck = textString.split(/\s/);
            if ("" !== dualSpaceCheck[dualSpaceCheck.length - 2]) {       
                var lastWordTyped = InputUtility.getLastWordTyped(textString);
                var prediction    = MakePrediction.init(lastWordTyped, textString);
                InputUtility.populatePrediction(InputUtility.wordGuess, textString, event);           
                InputUtility.populatePrediction(prediction, textString, event);
                InputUtility.updateCorpus(lastWordTyped, textString);
            }
        }
    },
    
    /**
    * Insert and highlight prediction in textarea
    */
    populatePrediction: function (prediction, textString, event) {
        if (typeof prediction !== "undefined" && "" !== prediction) {            
            var predictionLength = prediction.length;               
            textString           = textString + prediction; 
            InputUtility.applyTextstring(event, textString);            
            var stringLength     = textString.length;
            var cursorPoint      = stringLength - predictionLength;            
            InputUtility.populateEditableDiv(event, cursorPoint, stringLength, prediction);
            InputUtility.populateTextarea(event, cursorPoint, stringLength);
            MakePrediction.captureChars = true;
        }  
    }, 
    
    /**
    * Add compounded text string back to element
    */
    applyTextstring: function (event, textString) {
        if ("DIV" !== event.target.nodeName) {
            event.target.value = textString;
        }
    },
    
    /**
    * Show prediction in content editable
    */
    populateEditableDiv: function (event, cursorPoint, stringLength, prediction) {
        if ("DIV" === event.target.nodeName) {       
            if (window.getSelection) {
                var sel = window.getSelection();            
   
                if (sel.getRangeAt && sel.rangeCount) {
                    InputUtility.contentEditable = event.target.innerHTML;
                    var range = sel.getRangeAt(0);
                    var node  = document.createTextNode(prediction);
                    range.deleteContents();
                    range.insertNode(node);
                    range.setStartBefore(node);
                    range.setEndAfter(node);
                    sel.removeAllRanges();                     
                    sel.addRange(range);     
                }
            } else if (document.selection && document.selection.createRange) {
                document.selection.createRange().text = prediction;
            }
            InputUtility.predictionOn = true;
        }
    },
    
    /**
    * Show prediction in textarea
    */
    populateTextarea: function (event, cursorPoint, stringLength) {
        if ("DIV" !== event.target.nodeName) {
            event.target.setSelectionRange(cursorPoint, stringLength);
        }
    },
    
    /**
    * Get substring in either content editable or textarea
    */
    getString: function (event) {
        var obj = {
            TEXTAREA: event.target.value,
            INPUT: event.target.value,
            DIV: event.target.innerText
        };
        var str = null;
        
        if (obj.hasOwnProperty(event.target.nodeName)) {
            str = obj[event.target.nodeName];
        }
        
        return str;
    },
    
    /**
    * Get the last word that was typed
    */
    getLastWordTyped: function (textString) {   
        var array = textString.split(/\s+/);
       
        return array[array.length - 2];
    },
    
    /**
    * If last word ends a sentence, append new sentence to corpus, 
    * and then update prediction data
    */
    updateCorpus: function (lastWordTyped, textString) {
        var array = [".", "!", "?", ""];     
        if (array.indexOf(lastWordTyped[lastWordTyped.length - 1]) >= 0) {       
            var sentenceArray = InputUtility.getAllSentences(textString, array);          
            var lastSentence  = sentenceArray[sentenceArray.length - 1].trim();
            InputUtility.saveIfNotDuplicateSentence(lastSentence);
        }
    },
    
    /**
    * Get each sentences and filter out periods, 
    * question marks, and exclamation marks
    */
    getAllSentences: function (textString, array) {
        var textStringArray = textString.split(/(\.\s+|\?\s+|\!\s+)/);
        var sentenceArray   = [];
        for (i = 0; i <= textStringArray.length; i++) {
            if (typeof textStringArray[i] !== "undefined") {
                var index = array.indexOf(textStringArray[i].trim());
                if (-1 === index) {
                    sentenceArray.push(textStringArray[i]);
                }
            }
        }
        
        return sentenceArray;
    },
    
    /**
    * If the recent sentence is not the same 
    * as the previous sentence, then save to data store
    */
    saveIfNotDuplicateSentence: function (lastSentence) {
        var corpusSentenceArray  = WordPredictions.rawCorpus.split(".");
        var lastSentenceInCorpus = corpusSentenceArray[corpusSentenceArray.length - 2];
       
        if (
            lastSentenceInCorpus.trim() !== lastSentence.trim() 
            && lastSentence.indexOf(WordPredictions.delimiter) === -1
        ) {
            WordPredictions.rawCorpus            = WordPredictions.rawCorpus + " " + lastSentence + ".";
            InputUtility.previouslySavedSentence = lastSentence;       
            dataStore.clearDatabase(WordPredictions.init);
        }
    }
};

/**
* Make a prediction based on the input
*/
var MakePrediction = {
    captureChars: false,
    otherPredictions: [],
    wordBuild: "",
    
    /**
    * Clear/reset character capture
    */
    clearCharData: function () {
        MakePrediction.captureChars     = false;
        MakePrediction.otherPredictions = [];
        MakePrediction.wordBuild        = "";
    },
    
    /**
    * Get either next word, weigthed word, or multi word prediction
    */
    init: function (lastWordTyped, textString) {
        try {
            var result = "";
            var token  = MakePrediction.getToken(lastWordTyped);
            var canUse = false;
            
            if (typeof WordPredictions.corpusTokenizedArray[token] !== "undefined") {
                result = MakePrediction.getNextWordOrHighestFrequency(token);
                result = MakePrediction.getMultiWord(textString, result);
                
                return MakePrediction.validateResult(result, textString);
            }
        } catch (error) {
            console.log(error);
        }
    },
    
    /**
    * If text string has more than one word, 
    * then check for a multi word prediction
    */
    getMultiWord: function (textString, result) {
        if (textString.split(/\s+/).length > 2) {
            // Match pattern of multiple words used
            result = MakePrediction.checkForMultipleWordPattern(result, textString);
        }
        
        return result;
    },
    
    /**
    * Get either next word or a word with the greatest usage
    */
    getNextWordOrHighestFrequency: function (token) {
        if (MakePrediction.isDuplicateToken(token)) {
            // Get the next word with the greatest usage
            result = MakePrediction.convertTokenToWord(MakePrediction.getHighestFrequencyWord(token));          
        } else {
            // Get the next word only
            result = MakePrediction.getNextWord(token).split(".")[0];
        }
        
        return result;
    },
    
    /**
    * Post result validation
    */
    validateResult: function (result, textString) {
        // If prediction is a substring of the current sentence, then do not suggest it
        var sentences   = textString.split(".");
        var periodCheck = result.split(".");
        
        if (sentences[sentences.length - 1].indexOf(result) !== -1) {
            result = "";
        }
        
        if (periodCheck.length >= 2) {
            result = periodCheck[0];
        }
        
        return result;
    },
    
    /**
    * traverse the text string backwards and get every forward word pattern that matches
    * in the corpus
    */
    checkForMultipleWordPattern: function (result, textString) {
        textString          = textString.trim();
        var typedWordsArray = textString.split(/\s+/);
        var patternMatch    = "";
        var wordCount       = typedWordsArray.length - 1;
        var tempArray       = [];                     
                 
        for (var i = wordCount; i >= 0; i--) {
            tempArray.push(typedWordsArray[i]);                   
            var pattern   = '';
            for (var i2 = 0; i2 <= tempArray.length; i2++) {
                var tempArrayReversed = tempArray.slice().reverse();
                pattern = tempArrayReversed.join(" ");
                if (null !== pattern) {
                    var re       = new RegExp(pattern, 'g');
                    var hasMatch = WordPredictions.corpus.match(re);
                    
                    if ("" !== hasMatch && null !== hasMatch) {
                        patternMatch = hasMatch;
                    }
                }
            }
        }
       
        return MakePrediction.hasMultipleWords(patternMatch, result);
    },
    
    /**
    * Process, if the text string matches multiple words in the corpus
    */
    hasMultipleWords: function (patternMatch, result) { 
        if (typeof patternMatch[0] !== "undefined") {
            var patternWordsArray = patternMatch[0].split(/\s+/);
            var wordsCounted      = patternWordsArray.length; 
      
            if (true === MakePrediction.areWordsInPatternValid(wordsCounted, patternWordsArray)) {
                result = MakePrediction.getMultiWordResult(patternMatch, result, wordsCounted);
            }
        }
        
        return result;
    },
    
    /**
    * Create array of text after the typed words
    */
    createArrayOfMatchingText: function (tempCorpusArray, splitWord) {
        var array            = [];
        var partialTextArray = WordPredictions.corpus.split(splitWord);
   
        partialTextArray.map(function (value, index) {
            if (typeof value !== "undefined" && " " === value.charAt(0)) {
                array.push(value);
            }
        });
        
        return array;
    },
    
    /**
    * Add weight for every usage
    */
    processWeights: function (array, tempObj) {
        array.map(function (value, index) {
            if (typeof value !== "undefined") {                  
                if (tempObj.hasOwnProperty(value)) {
                    tempObj[value] = tempObj[value] + 1;
                } else {
                    tempObj[value] = 1;
                }           
            }
        });
        
        return tempObj;
    },
    
    /**
    * Parse each partial sentence containing the typed word 
    */
    addWeightsToReoccuringWords: function (multiOptions) {
        var tempObj = {};
        multiOptions.map(function (value, index) {
            if (typeof value !== "undefined") {
                var eachChoice = value.trim();
                eachChoice     = eachChoice.split(".")[0];
                var array      = eachChoice.split(" ");
                tempObj        = MakePrediction.processWeights(array, tempObj);
            }
        });
        
        return tempObj;
    },
    
    /**
    * Get each word with the same chosen weight
    */
    getWordsWithEqualHighestWeights: function (tempObj, countMatch) {
        var newString = '';
        for (var key in tempObj) {
          if (tempObj.hasOwnProperty(key)) {
            if (countMatch === tempObj[key]) {
                newString += " " + key;
            }
          }
        }
        
        return newString;
    },
    
    /**
    * Check for multiple words after the typed word in the corpus
    */
    getMultipleWordsAfterTypedWord: function (wordsCounted, tempCorpusArray, multiWordResult) {
        for (var i = 0; i <= wordsCounted; i++) {
            if (typeof tempCorpusArray[i] !== "undefined") {
                // Do not suggest, if partial word is in prediction
                if ("" !== tempCorpusArray[i] && typeof WordPredictions.wordDictionaryObj[tempCorpusArray[i]] === "undefined") {
                    multiWordResult = "";
                    break;
                } else {
                    multiWordResult += tempCorpusArray[i] + " ";
                }
            }
        }
        
        return multiWordResult;
    },
    
    /**
    * Check for sets of sentences that contain the typed word
    */
    processMultipleSetsOfSameWordText: function (countMatch, multiOptions, multiWordResult) {
        if (countMatch > 1) {
               var tempObj     = MakePrediction.addWeightsToReoccuringWords(multiOptions);
               multiWordResult = MakePrediction.getWordsWithEqualHighestWeights(tempObj, countMatch);                  
        }
        
        return multiWordResult;
    },
    
    /**  
    * Check for one sentence that contains the typed word
    */
    processSingleSetOfSameWordText: function (countMatch, wordsCounted, tempCorpusArray, multiWordResult) {
        if (countMatch <= 1) {
               multiWordResult = MakePrediction.getMultipleWordsAfterTypedWord(wordsCounted, tempCorpusArray, multiWordResult); 
        }
        
        return multiWordResult;
    },
    
    /**
    * Get the multiple words for prediction
    */
    hasMultipleWordPattern: function (partialCorpus, splitWord, wordsCounted) {
        var multiWordResult = "";
        if (typeof partialCorpus !== "undefined") {
            var tempCorpusArray = partialCorpus.split(" ");
            var multiOptions    = MakePrediction.createArrayOfMatchingText(tempCorpusArray, splitWord);
            var countMatch      = multiOptions.length;
            multiWordResult     = MakePrediction.processMultipleSetsOfSameWordText(countMatch, multiOptions, multiWordResult);
            multiWordResult     = MakePrediction.processSingleSetOfSameWordText(countMatch, wordsCounted, tempCorpusArray, multiWordResult);
        }
        
        return multiWordResult;
    },
    
    /**
    * Get a matching pattern from the corpus, 
    * but start with the next word after the matching pattern.
    */
    getMultiWordResult: function (patternMatch, result, wordsCounted) {
        var splitWord     = " " + patternMatch[0].trim();
        var partialCorpus = WordPredictions.corpus.split(splitWord)[1];          
        multiWordResult   = MakePrediction.hasMultipleWordPattern(partialCorpus, splitWord, wordsCounted);
        
        return MakePrediction.prepareMultiWordResult(multiWordResult, result);
    },
    
    /**
    * Remove spaces and/or periods from result
    */
    prepareMultiWordResult: function (multiWordResult, result) {
        var newResult = multiWordResult.trim();
        
        if ("" !== newResult && "" !== newResult.split('.')[0]) {
            result = newResult;
        }
      
        return result.split('.')[0];
    },
    
    /**
    * Validate each word in pattern with the word dictionary
    */
    areWordsInPatternValid: function (wordsCounted, patternWordsArray) {  
        for (var i2 = 0; i2 < wordsCounted; i2++) {
            if (typeof WordPredictions.wordDictionaryObj[patternWordsArray[i2]] === "undefined") {
                return false;
            }
        }
        
        return true;
    },
    
    /**
    * Get the next word that has the highest weight attached to it
    */
    getHighestFrequencyWord: function (token) {
        var wordAsToken   = "";
        var weight        = 0;
        var weightsObject = WordPredictions.tokenizedOccurenceObj[token];
        
        for (var key in weightsObject) {
          if (weightsObject.hasOwnProperty(key)) {
            if (weight < weightsObject[key]) {
                wordAsToken   = key;
                weight = weightsObject[key];
            }
          }
        }
        
        MakePrediction.saveOtherOptions(wordAsToken, weightsObject);
        
        return wordAsToken;
    },
    
    /**
    * Save other next words based on a single word 
    * in a global arrray for character matching
    */
    saveOtherOptions: function (wordAsToken, weightsObject) {
        var wordArray = [];
        for (var key in weightsObject) {
          if (weightsObject.hasOwnProperty(key)) {
            var word = WordPredictions.tokenDictionaryObj[key].split(".")[0]; 
            // Filter out top prediction  
            if (key !== wordAsToken) {        
                wordArray.push(word);
            }
          }
        }
        
        MakePrediction.otherPredictions = wordArray;
    },
    
    /**
    * Get the word corresponding to its token
    */
    convertTokenToWord: function (token) {
        var result = "";
        for (var key in WordPredictions.wordDictionaryObj) {
          if (WordPredictions.wordDictionaryObj.hasOwnProperty(key)) {
            if (Number(WordPredictions.wordDictionaryObj[key]) === Number(token)) {
                result = key;
                break;
            }
          }
        }
        
        return result;
    },
    
    /**
    * Get next word after typed word from corpus
    */
    getNextWord: function (token) {
        var result    = "";
        var index     = WordPredictions.corpusTokenizedArray.indexOf(token);
        var nextValue = WordPredictions.corpusTokenizedArray[index + 1];       
        
        return MakePrediction.convertTokenToWord(nextValue);
    },
    
    /**
    * Get the token of the word from the dictionary
    */
    getToken: function (lastWordTyped) {
        return WordPredictions.wordDictionaryObj[lastWordTyped];
    },
    
    /**
    * Check if word (as a token) has different next-word weights
    */
    isDuplicateToken: function (token) {
        return WordPredictions.tokenizedOccurenceObj.hasOwnProperty(token);
    }
};

/**
* Client side data store
*/
var dataStore = {
    /**
    * Creates data store if not exists
    */
    initializeDb: function () {
        var request = window.indexedDB.open("textPrediction", 1);

        request.onerror = function(){
            window.indexedDB.deleteDatabase("textPrediction");
            (new MessageManager()).renderMessage(ERROR, IDB_INIT_ERROR);
        };

        request.onupgradeneeded = function(event) {
            if (Number(event.oldVersion) > 0
                && (
                    Number(event.oldVersion) !== Number(1)
                )
            ) {
                window.indexedDB.deleteDatabase("textPrediction");
            } else {
                var db    = request.result;
                var store = db.createObjectStore(
                    "objectStore",
                    {keyPath: "id", autoIncrement: true}
                );				
            }
        };

        return request;
    },
     
    /**
    * Clear entire data store
    */
    clearDatabase: function (afterIndexedDbFunc) {
        var open = dataStore.initializeDb();
        open.onsuccess = function() {
            var resources = dataStore.dbResources(open);
            resources.store.clear();
            afterIndexedDbFunc();
        };

        open.onerror = function() {
            console.log('Error: could not clear database');
            return false;
        };
    },
    
    /**
    * Save to data store
    */
    saveRecord: function (obj, afterIndexedDbFunc) {
		var open = dataStore.initializeDb();
		open.onsuccess = function() {
			var resources = dataStore.dbResources(open);
			var request   = resources.store.add(obj.data);
			request.onsuccess = function(event) {
				afterIndexedDbFunc(obj);
			};
			dataStore.storageTransactionComplete(resources);
		};

		open.onerror = function() {
			console.log("Error: could not save text prediction resources");
			
			return false;
		};
	},
	
	/**
    * Get record from data store
    */
	getResources: function (afterGetResources) {
	    var open = dataStore.initializeDb();
        open.onsuccess = function() {
            var resources    = dataStore.dbResources(open);
		    var records      = [];
            var getAll       = resources.store.openCursor(null);
            
            getAll.onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
				    records.push(cursor.value);
                    cursor.continue();
                } else {
                    afterGetResources(records);
               
                    return false;
                }
            };
        };
        
        open.onerror = function() {
            console.log('Error: cannot get data');
            
            return false;
        };
	},

    /**
    * Get the data store
    */
    dbResources: function (openDb) {
        var db    = openDb.result;
        var tx    = db.transaction("objectStore", "readwrite");
        var store = tx.objectStore("objectStore");

        return {
            "db": db,
            "tx": tx,
            "store": store
        };
    },
    
    /**
    * Close transaction when completed
    */
    storageTransactionComplete: function (resources) {
        resources.tx.oncomplete = function() {
            resources.db.close();
        };
    }
};

/**
* Create resources to make next-word predictions
*/
var WordPredictions = {
    wordDictionaryObj: {},
    tokenDictionaryObj: {},
    tokenizedOccurenceObj: {},
    corpusTokenizedArray: [],
    corpus: "",
    rawCorpus: "",
    delimiter: ' *|*.', // Special delimiter
    
    /**
    * Get resources from the data store
    */
    init: function () {
        dataStore.getResources(WordPredictions.afterGetResources);
    },
    
    /**
    * Check if data store has data
    */
    afterGetResources: function (obj) {
        if (typeof obj[0] === "undefined") {
            WordPredictions.initResources();
        } else {
            if (false === WordPredictions.checkForUpdatedCorpus(obj[0])) {
                WordPredictions.createGlobalVariables(obj[0]);
            }
        }
    },
    
    /**
    * Check if corpus (js file) was updated
    * If so, update template corpus in data store while
    * preserving user's enteries
    */
    checkForUpdatedCorpus: function (obj) {
        var isUpdated             = false;
        var tempAndTypedTextArray = obj.rawCorpus.split(WordPredictions.delimiter);
        var originalCorpusText    = tempAndTypedTextArray[0];
        var typedText             = (typeof tempAndTypedTextArray[1] !== "undefined") 
            ? tempAndTypedTextArray[1]
            : "";

        if (originalCorpusText !== Template.corpus) {
            isUpdated = true;
            WordPredictions.rawCorpus = Template.corpus + WordPredictions.delimiter + typedText;
            dataStore.clearDatabase(WordPredictions.initResources);
        } 
        
        return isUpdated;
    },
    
    /**
    * Populate global variables with data from data store
    */
    createGlobalVariables: function (obj) {
        WordPredictions.corpus                = obj.corpus;
        WordPredictions.wordDictionaryObj     = obj.wordDictionaryObj; // Array with word => token      
        WordPredictions.tokenDictionaryObj    = obj.tokenDictionaryObj; // Array with token => word      
        WordPredictions.corpusTokenizedArray  = obj.corpusTokenizedArray; // corpus tokenized
        WordPredictions.tokenizedOccurenceObj = obj.tokenizedOccurenceObj; // Object of words as tokens used more than once with weights
        WordPredictions.rawCorpus             = obj.rawCorpus;
    },
    
    /**
    * Create each resource from raw corpus (large text string)
    */
    initResources: function () {
        try {
            WordPredictions.populateRawCorpus();
            var corpus                            = WordPredictions.stripErroneousCharacters(WordPredictions.rawCorpus);
            WordPredictions.corpus                = corpus;
            var wordArray                         = WordPredictions.convertCorpusToArrayOfWords(corpus); // Array of words
            var resultArray                       = WordPredictions.createArrayOfUniqueWordsOnly(wordArray);
            var uniqueWords                       = resultArray[0]; // Array of unique words only
            var occurenceObj                      = resultArray[1]; // Object of words used more than once with weights
            var tokenizedArray                    = WordPredictions.tokenizeWords(uniqueWords); // Array of uniquewords as tokens 
            
            WordPredictions.wordDictionaryObj     = WordPredictions.createWordDictionary(tokenizedArray, uniqueWords); // Array with word => token 
            WordPredictions.tokenDictionaryObj    = WordPredictions.createTokenDictionary(); // Array with token => word      
            WordPredictions.corpusTokenizedArray  = WordPredictions.tokenizeCorpus(wordArray); // corpus tokenized
            WordPredictions.tokenizedOccurenceObj = WordPredictions.tokenizeOccurenceObj(occurenceObj); // Object of words as tokens used more than once with weights
            
            WordPredictions.initSaveResourcesToDataStore();
        } catch (error) {
            console.log(error);
        }
    },
    
    /**
    * Add a unique id to each word
    */
    createTokenDictionary: function () {
        var obj = {};
        
        for (var key in WordPredictions.wordDictionaryObj) {
          if (WordPredictions.wordDictionaryObj.hasOwnProperty(key)) {
            obj[WordPredictions.wordDictionaryObj[key]] = key;
          }
        }
     
        return obj;
    },
    
    /**
    * If global raw corpus is empty, 
    * then populate with template corpus
    */
    populateRawCorpus: function () {
        if ("" === WordPredictions.rawCorpus) {
            WordPredictions.rawCorpus = Template.corpus + WordPredictions.delimiter;
        }
    },
    
    /**
    * Save prediction resources to data store
    */
    initSaveResourcesToDataStore: function () {
        var resourcesObj = {
        data: {
                wordDictionaryObj: WordPredictions.wordDictionaryObj,
                tokenDictionaryObj: WordPredictions.tokenDictionaryObj,
                corpusTokenizedArray: WordPredictions.corpusTokenizedArray,
                tokenizedOccurenceObj: WordPredictions.tokenizedOccurenceObj,
                rawCorpus: WordPredictions.rawCorpus,
                corpus: WordPredictions.corpus    
            }
        };
        
        dataStore.saveRecord(resourcesObj, WordPredictions.afterSavingResources);
    },
    
    /**
    * After saving resources to data store
    */
    afterSavingResources: function (obj) {
        //console.log(JSON.stringify(obj));
    },
    
    /**
    * Create array of each word in corpus, and then tokenize the words in consecutive order
    */
    tokenizeCorpus: function (wordArray) {
        var array = [];
        
        wordArray.map(function (value, index) {
            if (WordPredictions.wordDictionaryObj.hasOwnProperty(wordArray[index])) {
                array.push(WordPredictions.wordDictionaryObj[wordArray[index]]);
            }
        });
        
        return array;
    },
    
    /**
    * Convert object to hold weighted next-words
    */
    tokenizeOccurenceObj: function (occurenceObj) {
        var tokenizedOccurenceObj = {};
        
        for (var key in occurenceObj) {
          if (occurenceObj.hasOwnProperty(key)) {
            var nextWordObj = WordPredictions.tokenizeNextWords(occurenceObj[key]);
            tokenizedOccurenceObj[WordPredictions.wordDictionaryObj[key]] = nextWordObj;
          }
        }
        
        return tokenizedOccurenceObj;
    },
    
    /**
    * Convert each weighted word to a number
    */
    tokenizeNextWords: function (obj) {
        var returnObj = {};
        
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            returnObj[WordPredictions.wordDictionaryObj[key]] = obj[key];
          }
        }
        
        return returnObj;
    },
    
    /**
    * Place each word in the corpus into an array
    */
    convertCorpusToArrayOfWords: function (corpus) {
        return corpus.split(" ");
    },
    
    /**
    * Create numbering for each word
    */
    tokenizeWords: function (wordArray) {
        var tokenizedArray = [];
        
        wordArray.map(function (value, index) {
            tokenizedArray.push(index + 1);
        });
        
        return tokenizedArray;
    },
    
    /**
    * Return array of unique words in corpus and object of weigthed next-words
    */
    createArrayOfUniqueWordsOnly: function (wordArray) {
        var uniqueArray  = [];
        var occurenceObj = {};
        
        wordArray.map(function (value, index) {
            occurenceObj = WordPredictions.getOccurence(occurenceObj, uniqueArray, wordArray, index);
            uniqueArray = WordPredictions.filterForUnique(uniqueArray, wordArray[index]);
        });
        
        return [uniqueArray, occurenceObj];
    },
    
    /**
    * If not in array, insert it
    */
    filterForUnique: function (uniqueArray, word) {
        if (typeof word !== "undefined" && uniqueArray.indexOf(word) === -1) {
            uniqueArray.push(word);
        }
        
        return uniqueArray;
    },
    
    /**
    * Create the weights for same words
    */
    getOccurence: function (occurenceObj, uniqueArray, wordArray, i) {
        if (typeof wordArray[i] !== "undefined" && uniqueArray.indexOf(wordArray[i]) !== -1) {
            var obj = {};
            
            wordArray.map(function (value, index) {
                var nextIndex = index + 1;
                if (wordArray[i] === wordArray[index] && typeof wordArray[nextIndex] !== "undefined") {
                    var weight = 1;
                    if (obj.hasOwnProperty(wordArray[nextIndex])) {
                        weight = occurenceObj[wordArray[i]][wordArray[nextIndex]] + 1;
                        occurenceObj[wordArray[i]][wordArray[nextIndex]] = weight;
                    } else {
                        obj[wordArray[nextIndex]]  = weight;
                        occurenceObj[wordArray[i]] = obj;
                    }
                }
           });
        }

        return occurenceObj;
    },
    
    /**
    * create array for words and their respective numbers (i.e. word: number)
    */
    createWordDictionary: function (tokenizedArray, uniqueWords) {
        var obj = {};
        
        tokenizedArray.map(function (value, index) {
            obj[uniqueWords[index]] = value;   
        });
      
        return obj;
    },
    
    /**
    * Remove commas, semi-colons, quotes
    */
    stripErroneousCharacters: function (rawCorpus) {
        return rawCorpus.replace(/\;|,|\"/g, '');
    }
};

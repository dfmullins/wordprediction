# wordprediction

This word prediction JS plugin uses an updatable corpus to predict words as you type. The plugin also saves new words in a data store on your browser as you type each sentence. Moreover, the corpus can be updated while preserving user entered words. Here's a workflow of how predictions are made:

1. Predict word based on letters typed (e.g. ple = please or user@ = user@gmail.com)
2. *For input fields, a drop down of word choices will appear based on the letters typed
3. Predict next word based on frequently (weighted) used word combination used often (e.g. please = please let)
4. Predict next word based on standard (no weights available) word combination used once (e.g. please = please see)
5. Predict next few words based on previously typed words (e.g. let me know = let me know if you have)
6. Predict entire sentence based on previously typed words continued (e.g. let me know if = let me know if you have any questions)
7. Save sentence if ends with a period, question mark, or exclamation mark.


The plugin can be activated on textareas, input fields, and WYZIWYG editors, by adding the class "wordPrediction". To install this plugin, simply add it to your project like you would any other JS file. You do need to include jQuery solely for the purpose of WYZIWYG editor compatibility. Lastly, this plugin is compatible with IE11, Edge, Chrome, and FireFox.

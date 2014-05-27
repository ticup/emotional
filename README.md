emotional
=========

Subjectivtiy and sentiment/polarity analysis library for Node.js.

Partial port from the [pattern.en library of CLIPS (University of Antwerp)](http://www.clips.ua.ac.be/pages/pattern-en), so all credits go to the original authors [Tom De Smedt](http://organisms.be) and [Walter Daelemans](http://www.cnts.ua.ac.be/~walter/). It's based on their own acquired [adjective sentiment database](https://github.com/ticup/emotional/blob/master/en/en-sentiment.xml).

Explanation taken from their website (and slightly altered to fit this module):



Written text can be broadly categorized into two types: facts and opinions. Opinions carry people's sentiments, appraisals and feelings toward the world. The emotional module bundles a lexicon of adjectives (e.g., good, bad, amazing, irritating, ...) that occur frequently in product reviews, annotated with scores for sentiment polarity (positive ↔ negative) and subjectivity (objective ↔ subjective). 

The emotional.get(sentence) function returns a { polarity: [-1, 1], subjectivity: [0, 1], assessments: ...} object for the given sentence, based on the adjectives it contains, where polarity is a value between -1.0 and +1.0 and subjectivity between 0.0 and 1.0. The sentence should be a string.

The emotional.positive(sentence, threshold) function returns True if the given sentence's polarity is above the threshold. The threshold can be lowered or raised, but overall +0.1 gives the best results for product reviews. Accuracy is about 75% for movie reviews.


This sentiment analyzer also incorporates emoticons for mood setting and ! punctuation for enhancement.


Usage
-----

Install with npm:

    npm install emotional

Import library and make sure the database is loaded with *load*.
Then start using the *get* or *positive* functions on the emotional object.

```javascript
var emotional = require("emotional");
emotional.load(function () {
  emotional.get("sentence") // { polarity: [-1,1], subjectivity: [0,1], assessments: ... };
  emotional.positive("sentence") // true | false
});
```

```javascript
var emotional = require("emotional");
emotional.load(function () {
  emotional.get("The movie attempts to be surreal by incorporating various time paradoxes,"+
                "but it's presented in such a ridiculous way it's seriously boring.")
  // = {
  //    polarity: -0.21
  //    subjectivity: 0.8
  //    assessments:
  //      [['surreal'], 0.25, 1, null],
  //      [['various'], 0, 0.5, null],
  //      [['such'], 0, 0.5, null],
  //      [['ridiculous'], -0.33, 1, null],
  //      [['seriously', 'boring'], -1, 1, null]]);
  //    }
  // i.e. it is a very subjective sentence, expressing a negative opinion.

  emotional.get('Wonderfully awful! :-)');
  // = {
  //    polarity = -0.25,
  //    subjectivity = 1,
  //    assessments = [
  //      [['wonderfully', 'awful', '!'], -1.0, 1.0, null],
  //      [[':-)'], 0.5, 1.0, 'mood']]
  //    };
  // 'wonderfully', 'awful' and '!' are assessed together and analyzed as very subjective and negative

  emotional.get('Today is monday!');
  // = {
  //  polarity = 0,
  //  subjectivity = 0,
  //  assessments = []
  // }
  // Nothing subjective here.

  emotional.positive("This is a good movie") // true
  emotional.positive("this is a bad movie") // false
  emotional.positive("This is a good movie", 0.8) // false
  emotional.positive("This is a really good movie", 0.8) // true
});
)
```


Test
-----

In order to run the tests, make sure all dependencies are installed with
    
    npm install

and then simply run with

    npm test



License (BSD)
-------------
Copyright (c) 2011-2013 University of Antwerp, Belgium
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright 
    notice, this list of conditions and the following disclaimer in
    the documentation and/or other materials provided with the
    distribution.
  * Neither the name of Pattern nor the names of its
    contributors may be used to endorse or promote products
    derived from this software without specific prior written
    permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

/*
 * Emotional
 *
 * Node.js subjectivity and polarity/sentiment analysis tool
 * Partial port from the pattern.en python library: http://www.clips.ua.ac.be/pages/pattern-en of the University of Antwerp
 * All credits go to the original writer: Tom de Smedt
 */

var _            = require("underscore");
var _str         = require("underscore.string");

var fs           = require("fs");
var xml2js       = require("xml2js");
var xmlParser    = new xml2js.Parser();
var find_tokens  = require("tokepi");
var EMOTICONS    = require("emotional-emoticons");


var MOOD  = "mood";  // emoticons, emojis
var IRONY = "irony"; // sarcasm mark (!)



/*
 * Sentiment Constructor
 * To be instantiated for a certain language
 */
function Sentiment(args) {
  this.path = args.path || "";
  this.language = args.language;
  this.confidence = args.confidence || null;
  this.synset = args.synset;
  this.synsets = {};
  this.labeler = {};
  this.negations = def(args.negations, ["no", "not", "n't", "never"]);
  this.modifiers = def(args.modifiers, ["RB"]);
  this.modifier = def(args.modifier, function (w) { return _str.endsWith(w, "ly"); });
  this.tokenizer = def(args.tokenizer, find_tokens);
}


// Load sentiment db path if given, otherwise load standard file provided by the language
Sentiment.prototype.load = function(path, finish) {
  if (_.isFunction(path)) {
    finish = path;
    path = undefined;
  }

  var self = this;
  path = path || this.path;
  getXml(path, function (xml) {
    xml = xml.sentiment;
    var words = {};
    var synsets = {};
    var labels = {};
    xml.word.forEach(function (word) {
      word = word.$;

      // skip if confidence threshold set and word is not belong threshold
      if (_.isNull(self.confidence) || self.confidence <= parseFloat(def(word.confidence, 0.0))) {
        var w = word.form;
        var pos = word.pos;
        var p = def(word.polarity, 0.0);
        var s = def(word.subjectivity, 0.0);
        var i = def(word.intensity, 1.0);
        var label = word.label;
        var synset = word[self.synset]; // wordnet_id, cornetto_id, ...
        var psi = [parseFloat(p), parseFloat(s), parseFloat(i)];

        if (!_.isUndefined(w)) {
          setDefault(setDefault(words, w, {}), pos, []).push(psi);
        }
        if ((!_.isUndefined(w)) && (!_.isUndefined(label))) {
          labels[w] = label;
        }
        if (!_.isUndefined(synset)) {
          setDefault(synsets, synset, []).push(psi);
        }
      }
    });
    self.language = xml.$.language || self.language;

    // Average scores of all word senses per part-of-speech tag.
    Object.keys(words).forEach(function (w) {
      Object.keys(words[w]).forEach(function (pos) {
        words[w][pos] = _.zip.apply(_, words[w][pos]).map(avg);
      });
    });

    // Average scores of all part-of-speech tags.
    Object.keys(words).forEach(function (w) {
      words[w][null] = _.zip.apply(_, _.values(words[w])).map(avg);
    });

    // Average scores of all synonyms per synset.
    Object.keys(synsets).forEach(function (id) {
      var psi = synsets[id];
      synsets[id] = _.zip.apply(_, psi).map(avg);
    });

    self.words = words;
    self.labeler = labels;
    self.synsets = synsets;
    finish();
  });
};


// Add given word with part-of-speach to the database with given polarity, subjectivity and intensity.
Sentiment.prototype.annotate = function (w, pos, p, s, i, label) {
  var self = this;
  var entry = setDefault(self.words, w, {});
  entry[pos] = entry[null] = [p, s, i];
  if (!_.isUndefined(label)) {
    self.labeler[w] = label;
  }
};


// Sentiment.prototype.getSynset = function (id, pos) {
//   var self = this;
//   pos = pos || ADJECTIVE;
//   if (_.keys(self.words).length === 0) {
//       throw Error("No sentiment corpus loaded");
//     }

//   id = _str.pad(id.toString(), 8, "0");
//   if (! (_str.startsWith(id, "n-") &&
//          _str.startsWith(id, "v-") &&
//          _str.startsWith(id, "a-") &&
//          _str.startsWith(id, "r-"))) {
//     switch (pos) {
//       case NOUN:
//         id = "n-" + id;
//         break;
//       case VERB:
//         id = "v-" + id;
//         break;
//       case ADJECTIVE:
//         id = "a-" + id;
//         break;
//       case ADVERB:
//         id = "r-" + id;
//         break;
//     }
    
//     var syn = self.synsets[id];
//     if (_.isUndefined(syn)) {
//       syn = def(self.synsets[id.replace(/-0+/, "-")], [0.0, 0.0]);
//     }
//     return syn.slice(0,2);
//   }


// };


function avgAssessment(assessments, weighted) {
    var w;
    var s = 0;
    var n = 0;
    assessments.forEach(function (ws) {
      w = weighted(ws[0]);
      s += w * ws[1];
      n += w;
    });
    if (n === 0) {
      return 0;
    } else {
      return s / n;
    }
  }

// Return the subjectivity and polarity/sentiment of given string
Sentiment.prototype.get = function (s, negation, weight) {
  var self = this;
  weight = def(weight, (function () { return 1; }));
  var a;
  
  if (_.keys(self.words).length === 0) {
    throw Error("No sentiment database is loaded, please call 'load' first.");
  }

  if (!_.isString(s)) {
    throw new Error("unknown input " + s + " only know sentences of type string");
  }

  var tokens = self.tokenizer(s);
  a = self.assessments(tokens.join(" ").split(" ").map(function (w) { return [w.toLowerCase(), null]; }), negation);

  return {
    polarity: avgAssessment(a.map(function (w) { return [w[0], w[1]]; }), weight),
    subjectivity: avgAssessment(a.map(function (w) { return [w[0], w[2]]; }), weight),
    assessments: a
  };
};


// Returns an array of [chunk, polarity, subjectivity, label] arrays for the given vector of words:
// where chunk is a vector of successive words: a known word optionally
// preceded by a modifier ("very good") or a negation ("not good").
Sentiment.prototype.assessments = function (words, negation) {
  var self = this;
  var prev, w, p, s, x;
  negation = _.isUndefined(negation) ?  true : negation;
  var a = [];
  var m = null; // Preceding modifier (i.e., adverb or adjective).
  var n = null; // Preceding negation (e.g., "not beautiful").
  words.forEach(function (wp) {
    var w = wp[0];
    var pos = wp[1];

    // will return arrays where indexes are as follows:
    // 0 = "w", 1 = "p", 2 = "s", 3 = "i", 4 = "n", 5 = "x"

    // Only assess known words, preferably by part-of-speech tag.
    // Including unknown words (polarity 0.0 and subjectivity 0.0) lowers the average.
    if (_.isNull(w)) return;

    // If we know the word from the sentimental corpus
    var entry = self.words[w];
    if ((!_.isUndefined(entry)) && (!_.isUndefined(entry[pos]))) {
      var p = entry[pos][0];
      var s = entry[pos][1];
      var i = entry[pos][2];

      // Known word not preceded by a modifier, e.g "good".
      if (_.isNull(m)) {
        a.push([[w], p, s, i, 1, self.labeler[w]]);
      }
      
      prev = a[a.length-1];

      // Known word preceded by a modifier, e.g. "really good".
      if (!_.isNull(m)) {
        prev[0].push(w);
        prev[1] = Math.max(-1.0, Math.min(p * prev[3], +1.0));
        prev[2] = Math.max(-1.0, Math.min(s * prev[3], +1.0));
        prev[3] = i;
        prev[5] = self.labeler[w];
      }

      // Known word preceded by a negation, e.g. "not really good".
      if (!_.isNull(n)) {
        prev[0] = [n].concat(prev[0]);
        prev[3] = 1.0 / prev[3];
        prev[4] = -1;
      }

      // Known word may be a negation.
      // Known word may be modifying the next word (i.e., it is a known adverb).
      m = null;
      n = null;
      if ((!_.isUndefined(pos)) &&
          (!_.isUndefined(self.modifiers[pos])) ||
          _.any(self.modifiers.map(function (modifier) { return !_.isUndefined(entry[modifier]); }))) {
        m = [w, pos];
      }
      if (negation && (!_.isUndefined(self.negations[w]))) {
        n = w;
      }

    // Unknown word 
    } else {

      // negation
      if (negation && (!_.isUndefined(self.negations[w]))) {
        n = w;

      // Retain negation across small words ("not a good").
      } else if ((!_.isNull(n)) && _str.strip(w, "'").length > 1) {
        n = null;
      }

      // May be a negation preceded by a modifier ("really not good").
      if ((!_.isNull(n)) && (!_.isNull(m)) &&
                ((!_.isUndefined(self.modifiers[pos])) || (!_.isUndefined(self.modifier(m[0]))))) {
        prev = a[a.length-1];
        prev[0].push(n);
        prev[4] = -1;
      
      // Retain modifier across small words ("really is a good").
      } else if ((!_.isNull(m)) && (w.length > 2)) {
        m = null;
      }

      // Exclamation mark boosts previous word
      if (w == "!" && a.length > 0) {
        prev = a[a.length-1];
        prev[0].push("!");
        prev[1] = Math.max(-1.0, Math.min(prev[1] * 1.25, +1.0));
      }

      // Exclamation marks in parentheses indicate sarcasm.
      if (w == "(!)") {
        a.push([[w], 0.0, 1.0, 1.0, 1, IRONY]);
      }

      // EMOTICONS: {("grin", +1.0): set((":-D", ":D"))}
      // if ((!w.match(/^[0-9]+$/i)) && (w.length <= 5) && _str.include(PUNCTUATION, w)) {
        Object.keys(EMOTICONS).forEach(function (type) {
          if (_.contains(EMOTICONS[type].e, w.toLowerCase())) {
            a.push([[w], EMOTICONS[type].p, 1.0, 1.0, 1, MOOD]);
          }
        });
      // }

    }
  });

  for (var i=0; i<a.length; i++) {
    w = a[i][0];
    p = a[i][1];
    s = a[i][2];
    n = a[i][4];
    x = a[i][5];
    // "not good" = slightly bad, "not bad" = slightly good.
    a[i] = [w, (n < 0 ? (p * -0.5) : p), s, x];
  }

  return a;
};

Sentiment.prototype.positive = function (s, threshold) {
  threshold = def(threshold, 0.1);
  var result = this.get(s);
  return (result.polarity >= threshold);
};


// Initialize the sentiment analyser for english text
var sentiment = new Sentiment({path: __dirname + "/en/en-sentiment.xml", synset: "wordnet_id"});
sentiment.load = function load(callback) {
  var self = this;
  Sentiment.prototype.load.call(self, function () {
    Object.keys(self.words).forEach(function (w) {
      Object.keys(self.words[w]).forEach(function (pos) {
        var nw = w;
        if (pos === "JJ") {
          if (_str.endsWith(w, "y")) {
            nw = w.slice(0, w.length-1) + "i";
          }
          if (_str.endsWith(w, "le")) {
            nw = w.slice(0, w.length-2);
          }
          var entry = self.words[w][pos];
          var p = entry[0];
          var s = entry[1];
          var i = entry[2];
          self.annotate(nw+"ly", "RB", p, s, i);
        }
      });
    });
    callback();
  });
};


/*
 * Auxiliary Functions
 */

// Average of number vector (0 if empty)
function avg(vct) {
  if (vct.length === 0) {
    return 0;
  }
  return (vct.reduce(function (a, c) { return a + c; }, 0) / vct.length);
}

// Returns value if value is defined, otherwise defValue.
function def(value, defValue) {
  if (_.isUndefined(value)) {
    return defValue;
  }
  return value;
}

// If given key is set in the object it returns the associated value, 
// otherwise it sets the value to val and returns it.
function setDefault(obj, key, val) {
  if (_.isUndefined(obj[key])) {
    obj[key] = val;
    return val;
  }
  return obj[key];
}


// Read and Parse XML file from given path, pass result to finish
// Any error that occurs is simpy thrown.
function getXml(path, finish) {
  fs.readFile(path, function(err, data) {
      if (err) throw err;
      xmlParser.parseString(data, function (err, result) {
        if (err) throw err;
        finish(result);
      });
  });
}

module.exports = sentiment;
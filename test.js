var sentiment = require('./index.js');
var should    = require('should');

describe('Emotional test cases', function () {
  describe('get', function () {
    it('should throw an error if load was not called yet', function () {
      (function () { require("./index.js").get("my sentence"); }).should.throwError();
    });
  });

  describe('load', function () {
    it('should call given callback when the database is loaded', function (done) {
      sentiment.load(function () {
        done();
      });
    });
  });

  describe('get', function () {
    it('should an object with polarity, subjectvitiy and assessments if load was called', function (done) {
      sentiment.load(function () {
        var result = sentiment.get('my sentence');
        should.exist(result);
        result.should.have.property('polarity');
        result.polarity.should.be.a.Number;
        result.should.have.property('subjectivity');
        result.subjectivity.should.be.a.Number;
        result.should.have.property('assessments');
        result.assessments.should.be.an.Array;
        done();
      });
    });
  });

  describe('positive', function () {
    it('should return true for a positive sentence (default threshold >= 0.1)', function (done) {
      sentiment.load(function () {
        var result = sentiment.positive('This is a good book');
        result.should.equal(true);
        done();
      });
    });
    it('should return false for a negative sentence (default threshold < 0.1)', function (done) {
      sentiment.load(function () {
        var result = sentiment.positive('This is a bad book');
        result.should.equal(false);
        done();
      });
    });
    it('should use given threshold', function (done) {
      sentiment.load(function () {
        var result = sentiment.positive('This is a good book', 0.8);
        result.should.equal(false);
        result = sentiment.positive('This is a very good book', 0.8);
        result.should.equal(true);
        done();
      });
    });
  });

  describe('use case 1', function () {
    it('should return given values (this can fail if you supplied another sentiment file!', function (done) {
      sentiment.load(function () {
        var result = sentiment.get("The movie attempts to be surreal by incorporating various time paradoxes, but it's presented in such a ridiculous way it's seriously boring.");
        result.polarity.should.equal(-0.21666666666666665);
        result.subjectivity.should.equal(0.8);
        result.assessments.length.should.equal(5);
        result.assessments.should.eql([
          [['surreal'], 0.25, 1, null],
          [['various'], 0, 0.5, null],
          [['such'], 0, 0.5, null],
          [['ridiculous'], -0.3333333333333333, 1, null],
          [['seriously', 'boring'], -1, 1, null]]);
        done();
      });
    });
  });

  describe('use case 2', function () {
    it('should return given values (this can fail if you supplied another sentiment file!', function (done) {
      sentiment.load(function () {
        var result = sentiment.get("Wonderfully awful! :-)");
        result.polarity.should.equal(-0.25);
        result.subjectivity.should.equal(1);
        result.assessments.length.should.equal(2);
        result.assessments.should.eql([
          [['wonderfully', 'awful', '!'], -1.0, 1.0, null],
          [[':-)'], 0.5, 1.0, 'mood']]);
        done();
      });
    });
  });

});
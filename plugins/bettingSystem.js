const mongoose = require('mongoose');
const Bet = require('../models/bet');
const Point = require('../models/point');
const BetRound = module.exports = {};

var isOpen = true;
var round_id = 0;
// Used to open bets
BetRound.open = (callback) => {
  // Listen for 'AI round' event from Game Agent aka 8 round before start?
  // Then increase the round_id by 1 and set isOpen bool to true
  isOpen = true;
  round_id += 1;
  if(isOpen)
    callback('Get your bets in for the next AI Run (#)' + round_id + '. Dont know how? Type !help to find out more. Good luck!');
  else
    callback('Woops! Something went wrong BibleThump'); // unnecessary but an extra check doesnt help. if during stress round it's fine, we can remove it.
};

// Used to close bets
BetRound.close = (callback) => {
  // Close bets one round before AI round
  isOpen = false;
  BetRound.checkStatus((isOpen, round_id) => {
    Bet.countBetbyRoundId(123, (totalBets) => {
      callback('AI Round #' + round_id + ' is about to start. Bets are now closed. Total bets: ' + totalBets +'.');
    });
  });

};

// Used to stop entries in the bet
BetRound.stop = (callback) => {
  // AI Round has ended. Used to tell viewers winners are being calculated.
  isOpen = false; // for safety?!
  callback('AI Round #' + round_id + ' has finished! Winners are being calculated.');
};

// Used to calculate and save results
BetRound.calcResults = (callback) => {
  // debug data
  winners = {
    'finalscore': { name: 'd0p3t', exact: false, points: '213' },
    'matches': { name: 'serpent_ai', exact: true, points: '631' }
  };
  // Listen for end of 'AI round' from Game Agent.
  // Once ended => fire BetRound.stop, calculate winners, save results in database, update points
  // and inform chat for winners (in callback?)

  // --------HOW TO CALCULATE WINNERS? --------
  // 1. Set winning multiplier per category or a random multiplier between 1 & 1.5
  // 2. Keep track of # bets per category per round OR
  //      Query database for all data from current round_id and count per category
  // 3. Find a bet that is equal to the winning number of the category
  // 4. If found, we got a winner and they get a bonus (so multiplier+bonus)
  // 5. If NOT, we find winner CLOSEST to winning number and give them no bonus
  // 6. Announce winners in chat
  var finalscoreMultiplier = 0.8;
  var matchesMultiplier = 1.55;
  var categories = ['finalscore', 'matches'];
  BetRound.checkStatus((status, round) => {
    for (var i = 0; i < categories.length; i++) {
      Bet.getBetForCalc(round, categories[i], (err, bets) => {
        // In bets object, find amount thats equal to AI round
        // If not found search closest.
        // Multiply amount by multiplier for category
        // Insert winners with amount and whether it was exact prediction or not into winners object
      });
    };
    callback(winners); // Set callback to winners to do with it what we want
  });

};

// Used to check Bet Round anywhere in BetABoat
BetRound.checkStatus = (callback) => {
  callback(isOpen, round_id);
};

// Used to enter user to bet
BetRound.enter = (bet, callback) => {
  BetRound.checkStatus((openStatus, round ) => {
    if(openStatus) {
      // Check if user has bet before, if not create points document
      Point.getByUsername(bet.username, (err, userPoints) => {
        if(err) throw err;
        if(!userPoints) {
          var newPoints = new Point({
            user: bet.username
          });
          Point.newPoint(newPoints, (err, createdPoints) => {
            if(err) throw err;
          });
        }
      });
      Bet.getBetbyRoundIdAndCategory(bet.username, round, bet.category, (err, userFound) => {
        if(err)
          callback(err, null);
        else if(userFound)
          callback(null, '@' + bet.username + ', you\'ve already entered in Round ' + round + ' for Category ' + bet.category + '.');
        else {
          // No user found so go ahead and save the bet
          var newUser = new Bet({
            round_id: round,
            user: bet.username,
            category: bet.category,
            amount: bet.amount,
            created_at: Date.now()
          });
          Bet.addBet(newUser, (err, isSaved) => {
            if(err) throw err;
            if(!isSaved)
              callback(null, 'Something went wrong. Try again!');
          });
          // this is for debug. REMOVE AT PRODUCTION
          callback(null, '@' + bet.username + ', you successfully entered in Round ' + round + ' with the bet <' + bet.category + '> <' + bet.amount + '>.');
        }
      });
    }
    else {
      callback(null, 'Bets are closed for round #' + round +'! There\'s always a next round :)');
    }
  });
};
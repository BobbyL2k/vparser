/* jshint
    esversion:6,
    node:true
*/

// Special expression
const EMPTY_EXPRESSION = [];
// Special tokens
const END_OF_FILE = "END_OF_FILE";
const NAME = "NAME";

//////////////////////////////
//                          //
//    Grammar Definition    //
//                          //
//////////////////////////////

// register reserved words
const tokens = [
    'Function',
    'End',
    'Equal',
    'Of',
    'Return',
    'Add',
    'Subtract',
    'Multiply',
    'Divide',
    'Is', 'Equal', 'To',
    'Is', 'Less', 'Than',
    'If', 'Then',
    'EndIf',
    'Else',
    'While',
    ];

// register paterns
const expressions = {
    Program      : [['eGStatements', END_OF_FILE]],

    GStatements  : [['eFunction', 'eGStatements'],
                    ['eStatement', 'eGStatements'],
                    EMPTY_EXPRESSION],

    Function     : [['Function', NAME, 'eParameters', 'eFuncStates']],

    Parameters   : [[NAME, 'eParameters'],
                    ['End']],

    Statements   : [['eStatement', 'eStatements'],
                    ['End']],

    EndIfOrElse   : [['Else', 'eStatements'],
                    ['If']],

    Statement    : [['If', 'eStatement', 'Then', 'eStatements', 'eEndIfOrElse'],
                    ['While', 'eStatement', 'Then', 'eStatements', 'While'],
                    ['eTempStatement']],

    TempStates   : [['eTempStatement', 'eTempStates'],
                    ['End']],

    TempStatement: [[NAME, 'eStatementX']],

    StatementX   : [['eAssignment'],
                    ['eFunctionCall'],
                    ['eOperation'],
                    EMPTY_EXPRESSION],

    FuncStates   : [['eFuncState', 'eFuncStates'],
                    ['End']],

    FuncState    : [['eStatement'],
                    ['eReturn']],

    Assignment   : [['Equal', 'eStatement']],

    FunctionCall : [['Of', 'eTempStates']],

    Operation    : [['eOperator', 'eTempStatement']],

    Return       : [['Return', 'eTempStatement']],

    Operator     : [['Add'],
                    ['Subtract'],
                    ['Multiply'],
                    ['Divide'],
                    ['Is','eCmpOp']],

    CmpOp       : [['Less','Than'],
                    ['Equal','To']],
};

//////////////////////////////
//                          //
//  Checker  Implemntation  //
//                          //
//////////////////////////////

"use strict";
const assert = require('assert');
const fs     = require('fs');
const test   = require('test.js');

// register special token
var lookUp = {
    NAME        : 'NAME',
    END_OF_FILE : 'TOKEN',
};
var parsingTable = {};

function isExpression(name){
    return name.slice(0,1) == 'e';
}

function stripLeadingE(token){
    return token.slice(1);
}
class Parser{
    constructor(tokens, expressions, parsingTable, initialState){
        tokens.push(END_OF_FILE);
        tokens.push(NAME);
        this.tokens = tokens;
        this.expressions = expressions;
        this.parsingTable = parsingTable;
        this.initialState = initialState;
        this.reset();
    }
    feed(token){
        console.log("stack\n", this.stateStack);
        if( token === undefined ){
            token = END_OF_FILE;
            console.log("EOF");
        }else if( this.tokens.find((tokenInList)=>tokenInList == token) === undefined ){
            token = NAME;
        }

        var state = this.stateStack[this.stateStack.length-1];
        if(state.branch == -1){
            if(this.parsingTable[state.stateName][token] === undefined){
                console.log('token', token, 'not valid');
                console.log('in state', state.stateName);
                throw 'ERROR';
            }
            state.branch = this.parsingTable[state.stateName][token][0];
            state.index  = this.parsingTable[state.stateName][token][1];
            return this.feed(token);
        }

        if(state.index >= this.expressions[state.stateName][state.branch].length){
            this.stateStack.pop();
            state = this.stateStack[this.stateStack.length-1];
            state.index++;
            return this.feed(token);
        }

        var tokenInBranch = this.expressions[state.stateName][state.branch][state.index];

        if(isExpression(tokenInBranch)){
            var expressionName = stripLeadingE(tokenInBranch);
            console.log('expressionName', expressionName);
            var newState = {
                stateName: expressionName,
                branch: -1,
                index: 0,
            }
            this.stateStack.push(newState);
            return this.feed(token);
        }

        if(token == tokenInBranch){
            state.index++;
        }else{
            console.log("expect", tokenInBranch);
            throw "ERROR";
        }
    }
    reset(){
        this.stateStack = [{stateName:this.initialState, branch: -1, index:0}];
    }
}

{// Init System
    {// Init look up table (lookUp)
        test('Initialize System', function(){
            tokens.forEach( (token)=>{
                lookUp[token] = 'TOKEN';
            });
            for(var expressionName in expressions){
                lookUp['e' + expressionName] = 'EXPRESSION';
            }
            for(var token in lookUp){
                lookUp[token] = { type: lookUp[token] };
            }
        });
    }{// Validate
        test('Grammar Validation', function(){
            test('Grammar Token Validation', function(){
                function processBranch(branch){
                    branch.forEach( function(token){
                        assert(lookUp[token] !== undefined, `Check valid token failed : "${token}" in "${expressionName}"`);
                    });
                }
                for(var expressionName in expressions){
                    var expression = expressions[expressionName];
                    expression.forEach(processBranch);
                }
            });
            test('Non-recursiving Expression Validation', function(){
                var expressionTerminate = {};
                var changeFound = false;
                Object.keys(expressions).forEach((name)=>{expressionTerminate[name] = false;});
                var checkTerminate = function(branch){
                    if(branch.length > 0){
                        var firstSubExpression = branch[0];
                        if(lookUp[firstSubExpression].type == 'NAME'){
                            return true;
                        }else if(lookUp[firstSubExpression].type == 'TOKEN'){
                            return true;
                        }else if(lookUp[firstSubExpression].type == 'EXPRESSION'){
                            return expressionTerminate[firstSubExpression.slice(1)];
                        }else{
                            throw new Error(`Unknown Expression type : ${lookUp[firstSubExpression].type}`);
                        }
                    }else{
                        return true;
                    }
                };
                do{
                    changeFound = false;
                    for(var expressionName in expressions){
                        if(expressionTerminate[expressionName] === false){
                            var terminate = expressions[expressionName].every(checkTerminate);
                            if(terminate === true){
                                expressionTerminate[expressionName] = true;
                                changeFound = true;
                            }
                        }
                    }
                }while(changeFound);
                for(var key in expressionTerminate)
                    assert(expressionTerminate[key], `Expression ${key} is not terminating`);
            });
            test("Compute First Set", function(){
                function getTerminatingTokenFromExpression(expressionName){
                    var result = [];
                    expressions[expressionName].map(getTerminatingToken).forEach((arr)=>{
                        result = result.concat(arr);
                    });
                    return result;
                }
                function getTerminatingToken(branch){
                    if(branch.length > 0){
                        var firstSubExpression = branch[0];
                        if(lookUp[firstSubExpression].type == 'NAME'){
                            return [firstSubExpression];
                        }else if(lookUp[firstSubExpression].type == 'TOKEN'){
                            return [firstSubExpression];
                        }else if(lookUp[firstSubExpression].type == 'EXPRESSION'){
                            return getTerminatingTokenFromExpression(firstSubExpression.slice(1));
                        }
                    }else{
                        return ['EMPTY'];
                    }
                }
                for(var expressionName in expressions){
                    test(`Test single token per branch in ${expressionName}`, function(){
                        var terminatingToken = expressions[expressionName].map(getTerminatingToken);
                        var tokenUsed = {};
                        var reported = {};
                        for(var key in terminatingToken){
                            var posTok = terminatingToken[key];
                            posTok.sort();
                            for(var tokKey in posTok){
                                var token = posTok[tokKey];
                                if(tokenUsed[token] && !reported[token]){
                                    reported[token] = true;
                                    test.nonFatalFail(`Expression name : "${expressionName}" has "${token}" token in multiple branch`);
                                }
                                tokenUsed[token] = true;
                            }
                            lookUp[`e${expressionName}`].firstSet = terminatingToken;
                        }
                    });
                }
            });
            test("Compute Follow Set", function(){
                function hasEmptyExpression(expressionToken){
                    var firstSets = lookUp[expressionToken].firstSet;
                    for(var key in firstSets){
                        var firstSet = firstSets[key];
                        for(var keyTok in firstSet){
                            var tok = firstSet[keyTok];
                            if(tok == 'EMPTY'){
                                return true;
                            }
                        }
                    }
                    return false;
                }
                function joinSet(setA, setB){
                    var newSet = {};
                    for(let key in setA) newSet[key] = true;
                    for(let key in setB) newSet[key] = true;
                    return newSet;
                }
                function getTerminatingSet(tok){
                    var set = {};
                    var lookUpE = lookUp[tok];
                    if(lookUpE.type == 'EXPRESSION'){
                        for(var branchIndex=0; branchIndex<expressions[tok.slice(1)].length; branchIndex++){
                            var branch = expressions[tok.slice(1)][branchIndex];
                            for(var index=0; index<branch.length; index++){
                                var tSet = getTerminatingSet(branch[0]);
                                for(var key in tSet){
                                    if(tSet[key] && key != 'EMPTY')
                                        set[key] = true;
                                }
                                if(tSet.EMPTY !== true) break;
                            }
                        }
                        lookUpE.firstSet.forEach(function(branch, branchIndex){
                        });
                    }else{
                        set[tok] = true;
                    }
                    return set;
                }
                for(let expressionName in expressions){
                    let branches = expressions[expressionName];
                    lookUp[`e${expressionName}`].followSet = {};
                }
                var changesMade = false;
                var passCount = 0;
                function runPass(){
                    for(let expressionName in expressions){
                        let branches = expressions[expressionName];

                        for(var key in branches){
                            var branch = branches[key];

                            for(var index=0; index<branch.length; index++){
                                var currentLU = lookUp[branch[index]];

                                if(currentLU.type == 'EXPRESSION'){
                                    var sizeBefore = Object.keys(currentLU.followSet).length;
                                    if(index == branch.length-1){
                                        currentLU.followSet = joinSet(
                                            currentLU.followSet,
                                            lookUp[`e${expressionName}`].followSet);
                                    }else{
                                        var followSet = getTerminatingSet(branch[index+1]);
                                        currentLU.followSet = joinSet(
                                            currentLU.followSet,
                                            followSet);
                                    }
                                    if(sizeBefore != Object.keys(currentLU.followSet).length){
                                        changesMade = true;
                }   }   }   }   }   }

                do{
                    passCount++;
                    changesMade = false;
                    test(`Running ${passCount} pass`, runPass);
                }while(changesMade);
            });
            test("Compute Parsing Table", function(){
                function convertListListToSet(listList){
                    var set = {};
                    listList.forEach(function(list){
                        list.forEach(function(element){
                            set[element] = true;
                        });
                    });
                    return set;
                }
                var expressionName, branchIndex, index;
                var tokenUsed = {};
                function addToken(token){
                    // console.log('adding', token);
                    assert(tokenUsed[token] === undefined, `Expression "${expressionName}" has multiple token "${token}" in branch "${tokenUsed[token]}" and "${[branchIndex, index]}"`);
                    tokenUsed[token] = [branchIndex, index];
                }
                for(expressionName in expressions){
                    test(`Test single token per branch in ${expressionName}`, function(){
                        let branches = expressions[expressionName];
                        tokenUsed = {};

                        for(branchIndex=0; branchIndex<branches.length; branchIndex++){
                            var branch = branches[branchIndex];
                            // console.log('branchIndex', branchIndex);
                            var terminate;
                            if(branch.length > 0){
                                for(index=0; index<branch.length; index++){
                                    terminate = true;
                                    let currentLU = lookUp[branch[index]];
                                    // console.log('index', index);

                                    if(currentLU.type == 'EXPRESSION'){
                                        for(let key in convertListListToSet(currentLU.firstSet)){
                                            if(key !== 'EMPTY')
                                                addToken(key);
                                            else
                                                terminate = false;
                                        }
                                        // console.log('FS', );
                                    }else{
                                        addToken(branch[index]);
                                    }
                                    if(terminate) break;
                                }
                            }else{
                                index = 0;
                                let currentLU = lookUp[`e${expressionName}`];
                                // console.log("EMPTY BRANCH!!!", currentLU.followSet);
                                for(let key in currentLU.followSet)
                                    addToken(key);
                            }
                        }

                        parsingTable[expressionName] = tokenUsed;
                    });
                }
            });
        });
    }{
        {// First Set
            var outFirstSet = {};
            for(var key in expressions){
                outFirstSet[key] = {};
                for(var ele in lookUp[`e${key}`].firstSet){
                    for(var eles in lookUp[`e${key}`].firstSet[ele]){
                        var elev = lookUp[`e${key}`].firstSet[ele][eles];
                        outFirstSet[key][elev] = true;
                    }
                }
                outFirstSet[key] = Object.keys(outFirstSet[key]);
            }
            fs.writeFile("first-set.json", JSON.stringify(outFirstSet, null, 4), function(){});
        }
        {// Follow Set
            var outFollowSet = {};
            for(var key in expressions){
                outFollowSet[key] = {};
                for(var ele in lookUp[`e${key}`].followSet){
                    outFollowSet[key][ele] = true;
                }
                outFollowSet[key] = Object.keys(outFollowSet[key]);
            }
            fs.writeFile("follow-set.json", JSON.stringify(outFollowSet, null, 4), function(){});
        }
        {// Parsing Table
            var outParsingTable = {};
            for(var key in parsingTable){
                outParsingTable[key] = {};
                for(var token in parsingTable[key])
                    outParsingTable[key][token] = parsingTable[key][token][0];
            }
            fs.writeFile("parsing-table.json", JSON.stringify(outParsingTable, null, 4), function(){});
        }
        // test.summary();

        var parser = new Parser(tokens, expressions, parsingTable, "Program");
        var code;

        // parser.reset();
        // code = ["If x Is Less Than 3 Then",
        //             "x Equal x Add 1",
        //         "End If"].join(' ').split(' ');
        // for(var c=0; c<code.length; c++){
        //     console.log(
        //         "Processing", code[c], c
        //     );
        //     parser.feed(code[c]);
        // }parser.feed(undefined); // EOF

        // parser.reset();
        // code = ["Function eiei x y End",
        //                 "If x Is Less Than 3 Then",
        //                     "x Equal x Add 1",
        //                 "End If",
        //                 "Return x Add y",
        //             "End"].join(' ').split(' ');
        // for(var c=0; c<code.length; c++){
        //     console.log(
        //         "Processing", code[c], c
        //     );
        //     parser.feed(code[c]);
        // }parser.feed(undefined); // EOF

        // parser.reset();
        // var code = ["Function eiei x y End",
        //                 "While x Is Less Than 3 Then",
        //                     "x Equal x Add 1",
        //                     "y Equal y Divide 2",
        //                 "End While",
        //                 "Return y",
        //             "End",
        //             "eiei Of 1 Add 3 2 End"].join(' ').split(' ');
        // for(var c=0; c<code.length; c++){
        //     console.log(
        //         "Processing", code[c], c
        //     );
        //     parser.feed(code[c]);
        // }parser.feed(undefined); // EOF
    }
}
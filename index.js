#!/usr/bin/env node

"use strict";

var argc = process.argv.length;

if (argc < 3) {
  printHelp();
}

const fs = require("fs");

var filenames = [];
var separator = ";";

for(var i = 2; i != argc; ++i) {
  if(process.argv[i] == "-s") {
    if(argc > i + 1) {
      separator = process.argv[++i];
    } else {
      printHelp();
    }
  } else if(process.argv[i].startsWith("-s")) {
    separator = process.argv[i].substr(2);
  } else {
    filenames.push(process.argv[i]);
  }
}

if(filenames.length == 0) {
  printHelp();
}

filenames.forEach(processFile);

function processFile(filename) {
  fs.readFile(filename, "utf8", function(err, data) {
    if (err) {
      throw err;
    }

    console.log("\n------------------------------------");
    console.log(filename);
    console.log("------------------------------------\n");

    var matches = data.match(/CONTA:\s*(\d+)/);

    if (matches == null || matches.length == 0) {
      console.log("Formato desconhecido.");
      return;
    }

    var conta = matches[1];

    matches = data.match(/N\. (\d{4})\/(\d{1,3})/);

    var ano = getIntegerValue(matches[1]);
    var mes = getIntegerValue(matches[2]);

    console.log("Extracto da conta:\t" + conta +" (" + ano + "/" + mes + ")");

    matches = data.match(/SALDO INICIAL\s*((?:\d|\s)*\.\d\d)(-?)/);

    var saldo = getDecimalValue(matches[1]);

    console.log("Saldo inicial:\t\t" + saldo + " €");

    var movimentos_csv = "";

    var movimentos_regex = / (\d?\d)\.(\d\d) +(\d?\d)\.(\d\d) +((?:\d| )*\.\d\d) +((?:\d| )*\.\d\d)((?:(?! \d?\d\.\d\d).)*)/g;
    var movimento;
    while(movimento = movimentos_regex.exec(data)) {
      var m = getIntegerValue(movimento[1]);
      var d = getIntegerValue(movimento[2]);

      var a = ano;
      if(m != mes) {
          if(m == 1 && mes == 12) {
              ++a;
          } else if(m == 12 && mes == 1) {
              --a;
          }
      }

      var data_movimento = a + "/" + pad(m) + "/" + pad(d);

      m = getIntegerValue(movimento[3]);
      d = getIntegerValue(movimento[4]);

      a = ano;
      if(m != mes) {
          if(m == 1 && mes == 12) {
              ++a;
          } else if(m == 12 && mes == 1) {
              --a;
          }
      }

      var data_valor = a + "/" + pad(m) + "/" + pad(d);

      var valor = getDecimalValue(movimento[5]);

      var s = getDecimalValue(movimento[6]);
      if(s < saldo) {
          valor *= -1;
      }

      saldo = s;

      var descricao = getTextValue(movimento[7]);

      // console.log(data_movimento + "\t" + data_valor + "\t" + descricao + "\t" + valor + "\t" + saldo);

      fs.appendFileSync("do-" + conta + ".csv", [data_movimento, data_valor, descricao, valor, saldo].join(separator) + "\n");
    }

    console.log("\n------------------------------------\n");

    var regEx = /PERMANENTE\s*(\d{10}) *((?:\d| )*\.\d\d).*\s*.*DATA\s*(\d{4}\/\d{1,2}\/\d{1,2})\s*(?:\d{4}\/\d{1,2}\/\d{1,2}).*\s*(\d+)\s*(?:\d+).*\s*(\d*\.\d\d).*(?:\d*\.\d\d).*\s*(\d*\.\d\d).*(?:\d*\.\d\d).*\s*(\d*\.\d\d).*(?:\d*\.\d\d).*\s*.*(\d\.\d\d)/g; //.*\s*.*(\d\.\d\d\d-?).*\s*(\d\.\d\d\d-?).*\s*(\d\.\d\d\d-?)/;
    regEx.lastIndex = movimentos_regex.lastIndex;

    var noCredit = true;

    while(matches = regEx.exec(data)) {
      noCredit = false;

      var emprestimo = getIntegerValue(matches[1]);
      var montante = getDecimalValue(matches[2]);
      var cal_data = getTextValue(matches[3]);
      var n_prestacao = getIntegerValue(matches[4]);
      var valor = getDecimalValue(matches[5]);
      var capital = getDecimalValue(matches[6]);
      var juro = getDecimalValue(matches[7]);
      var comissao = getDecimalValue(matches[8]);

      var taxRegEx = /TAN\s*(\d\.\d\d\d-?).*\s*(\d\.\d\d\d-?).*\s*(\d\.\d\d\d-?)/g;
      taxRegEx.lastIndex = regEx.lastIndex;
      var taxMatches = taxRegEx.exec(data);

      var taxa = getDecimalValue(taxMatches[1]);
      var indexante = getDecimalValue(taxMatches[2]);
      var spread = getDecimalValue(taxMatches[3]);

      console.log("Empréstimo nº " + emprestimo);
      console.log("Montante em dívida:\t" + montante + " €");
      console.log();
      console.log("Prestação nº " + n_prestacao + " (" + cal_data + ")");
      console.log("\tValor:\t\t" + valor + " €");
      console.log();
      console.log("\tCapital:\t" + capital + " €");
      console.log("\tJuro:\t\t" + juro + " €");
      console.log();
      console.log("\tComissão:\t" + comissao + " €");
      console.log();
      console.log("\tTaxa:\t\t" + taxa + "%");
      console.log("\tIndexante:\t" + indexante + "%");
      console.log("\tSpread:\t\t" + spread + "%");

      var decimal_taxa = taxa ? round(taxa / 100, 6) : "";
      var decimal_indexante = indexante ? round(indexante / 100, 6) : "";
      var decimal_spread = spread ? round(spread / 100, 6) : "";

      fs.appendFileSync("cred-" + emprestimo + ".csv", [n_prestacao, cal_data, valor, capital, juro, comissao, decimal_taxa, decimal_indexante, decimal_spread, montante].join(separator) + "\n");
    }

    if(noCredit) {
      // código para um formato de extracto anterior
      var movimentos_regex = /(\d{10}) +((?:\d| )*\.\d\d) +(\d{4}\/\d{1,2}\/\d{1,2}) +(\d*\.\d\d)(?:[\s\S]*?(\d\.\d{1,3}-?)%.*?(\d\.\d{1,3}-?)%.*?(\d\.\d{1,3}-?)%)?/g;
      var movimento;
      while(movimento = movimentos_regex.exec(data)) {
        var emprestimo = getIntegerValue(movimento[1]);
        var montante = getDecimalValue(movimento[2]);
        var cal_data = getTextValue(movimento[3]);
        var n_prestacao = 0;
        var valor = getDecimalValue(movimento[4]);
        var capital = "";
        var juro = "";
        var comissao = "";
        var taxa = getDecimalValue(movimento[5]);
        if(isNaN(taxa)) {
          taxa = "";
        }
        var indexante = getDecimalValue(movimento[6]);
        if(isNaN(indexante)) {
          indexante = "";
        }
        var spread = getDecimalValue(movimento[7]);
        if(isNaN(spread)) {
          spread = "";
        }

        console.log("Empréstimo nº " + emprestimo);
        console.log("Montante em dívida:\t" + montante + " €");
        console.log();
        console.log("Prestação nº " + n_prestacao + " (" + cal_data + ")");
        console.log("\tValor:\t\t" + valor + " €");
        console.log();
        console.log("\tCapital:\t" + capital + " €");
        console.log("\tJuro:\t\t" + juro + " €");
        console.log();
        console.log("\tComissão:\t" + comissao + " €");
        console.log();
        console.log("\tTaxa:\t\t" + taxa + "%");
        console.log("\tIndexante:\t" + indexante + "%");
        console.log("\tSpread:\t\t" + spread + "%");

        fs.appendFileSync("cred-" + emprestimo + ".csv", [n_prestacao, cal_data, valor, capital, juro, comissao, taxa ? taxa / 100 : "", indexante ? indexante / 100 : "", spread ? spread / 100 : "", montante].join(separator) + "\n");
      }
    }

    console.log("\n------------------------------------");
  });
}

function pad(n) {
  return (n < 10) ? ("0" + n) : n;
}

function removeWhitespace(val) {
  return val.replace(/\s/g, "");
}

function getDecimalValue(val) {
  if(val == null || val == "") {
    return NaN;
  }

  var clean = removeWhitespace(val);
  return (clean.endsWith("-") ? -1 : 1) * parseFloat(clean);
}

function getIntegerValue(val) {
  if(val == null || val == "") {
    return NaN;
  }

  return parseInt(removeWhitespace(val));
}

function getTextValue(val) {
  return val.replace(/\s{2,}/g, " ");
}

function printHelp() {
  console.log("Usage: " + process.argv[1] + " [-s<char>] FILENAME");
  process.exit(1);
}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

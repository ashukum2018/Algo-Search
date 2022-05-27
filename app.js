//Requiring the modules -> It should always be done on the top
const express = require("express");
const ejs = require("ejs"); //View Engine
const path = require("path");
var fs=require('fs');
var porterStemmer = require( '@stdlib/nlp-porter-stemmer' );
const { parse } = require("path");
const { totalmem } = require("os");

// //Creating our server
const app = express();

app.use(express.json());

// //Setting Up EJS

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "/public")));

 const PORT = process.env.PORT || 3000;

// GET, POST, PATCH, DELETE

//@GET /
//description: GET request to home page
app.get("/", (req, res) => {
  res.render("index");
});



// IDFs STORAGE

idfs=[];

function calculate_IDF(){
  var text = fs.readFileSync("./IDF.txt", "utf-8");
  idfs =text.split("\n");
  for(let i=0;i<idfs.length;i++){
    idfs[i]=parseFloat(idfs[i]);
  }
}

//KEYWORDS STORAGE

keywords= new Map();
function make_keywords(){
  var text=fs.readFileSync("./keywords.txt", "utf-8");
  var data=text.split("\n");
  for(let i=0;i<data.length;i++){
    data[i]=data[i].slice(0, -1);
  }
  // console.log(data);
  for(let i=0;i<(data.length)-1;i++){
    keywords.set(String(data[i]), i);
  }
}

//MAGNITUDES STORAGE

let magnitudes=[];

function make_magnitudes(){
  var text=fs.readFileSync("./magnitude.txt", "utf-8");
  var data=text.split("\n");
  for(let i=0;i<data.length;i++){
    magnitudes.push(parseFloat(data[i]));
  }
  // console.log(magnitudes);
}



// var my_stopwords=new Set();

// function make_stopwords(){
//   var text=fs.readFileSync("./sw.txt", "utf-8");
//   var data=text.split("\n");
//   //  console.log(data);
//   for(let i=0;i<data.length;i++){
//      data[i]=data[i].slice(0, -2);
//     // console.log(data[i].length);
//     my_stopwords.add(data[i]);
//   }
//   // console.log(my_stopwords);
// }

// TERM FREQUENCY STORAGE

let tf=new Array(1156);
for(let i=0;i<1156;i++){
  tf[i]=new Array(4204);
}
for(let i=0;i<1156;i++){
  for(let j=0;j<4204;j++){
    tf[i][j]=0;
  }
}

function make_TF(){
  var text=fs.readFileSync("./TF.txt", "utf-8");
  var data=text.split("\n");
  for(let i=0;i<data.length;i++){
    var cur_row=data[i].split(" ");
     tf[parseInt(cur_row[0])][parseInt(cur_row[1])]=parseFloat(cur_row[2]);
  }
  // console.log(tf[1][174]);
  // for(let i=0;i<1156;i++){
  //   for(let j=0;j<4204;j++){
  //     if(tf[i][j]!=0){
  //       console.log(i, j);
  //     }
  //   }
  // }
} 

calculate_IDF();
make_keywords();
make_TF();
make_magnitudes();
// make_stopwords();
function calc_similarity(qdata_freq){
  let cnt=0;
  let arr=[];
  let tot=0;
  for(let [key, value] of qdata_freq.entries()){
    tot+=value;
  }
  for(let i=0;i<1155;i++){
    let cur_sim=0;
    let num=0;
    let query_mag=0;
   for (let [key, value] of  qdata_freq.entries()) {
     let val=value/tot;
    //  num+=tf[i+1][key]*value*idfs[key]*idfs[key];
    //  query_mag+=(value*value*idfs[key]*idfs[key]);
     num+=tf[i+1][key]*val*idfs[key]*idfs[key];
     query_mag+=(val*val*idfs[key]*idfs[key]);
    }
    query_mag=Math.sqrt(query_mag);
    cur_sim=(num)/(magnitudes[i]*query_mag);
    let cur_ele={
      "sim":cur_sim,
      "id":i+1
    };
    arr.push(cur_ele);
  }
  // console.log(arr);
  // console.log(cnt);
  arr=arr.sort((c1, c2) => (c1.sim < c2.sim) ? 1 : (c1.sim > c2.sim) ? -1 : 0);
  let ans=[];
  //viratkohli
  for(let i=0;i<10;i++){
    ans.push(arr[i]["id"]);
  }
  return ans;

}
let titles=[];

function make_titles(){
  var text=fs.readFileSync("./problem_titles.txt", "utf-8");
  var data=text.split("\n");
  for(let i=0;i<data.length;i++){
    let start=0;
    for(let j=0;j<10;j++){
      if(data[i][j]=='.'){
        start=j+2;
        break;
      }
    }
    titles.push(String(data[i].substring(start)));
  }
}

make_titles();
// console.log(titles);
let urls=[];
function make_urls(){
  var text=fs.readFileSync("./problem_urls.txt", "utf-8");
  var data=text.split("\n");
  for(let i=0;i<data.length;i++){
    data[i]=data[i].slice(0,-1);
    urls.push(data[i]);
  }
}

make_urls();
// console.log(urls);



app.get("/problem", (req, res)=>{
  const query=req.query;
  const qnum=query.qid;
  const title=`<center><h2 id="colstrip">${titles[qnum-1]}</h2></center>`;
  const qname=titles[qnum-1];
  var text=fs.readFileSync("./newPstatements/problem_"+qnum+".txt", "utf-8");
  text=text.replace(/<br><h4>Input/g, "<h4>Input");
  const cursor="Link";
  const url=`<a href=${urls[qnum-1].toLowerCase()} target="_blank">${cursor}</a><br>`;
  res.render("question", {body:text, title:title, url:url, qname:qname});
})




app.get("/search", (req, res) => {
  const query = req.query;
  const question = query.question;
  let qdata=question.split(" ");
  let sz=qdata.length;
  for(let i=0;i<sz;i++){
    var temp=porterStemmer(qdata[i].toLowerCase());
    qdata.push(temp);
  }
  qdata_freq=new Map();
  ids=[];
  for(let i=0;i<qdata.length;i++){
    let cur_word=qdata[i].toLowerCase();
    if(keywords.has(cur_word)==false){
      continue;
    }
    let cur_id=keywords.get(cur_word);
    if(qdata_freq.has(cur_id)==true){
      let cur_freq=qdata_freq.get(cur_id);
      qdata_freq.set(cur_id, cur_freq+1);
    }else{
      qdata_freq.set(cur_id, 1);
    }
    ids.push(cur_id);   
  }
    //  console.log(qdata_freq);
   let ans=calc_similarity(qdata_freq);
  //  console.log(ans);
  //  console.log(qdata_freq);
  // setTimeout(() => {
    const arr=[];
    //viratkohli
    for(let i=0;i<10;i++){
      let qnum=ans[i];
      var text=fs.readFileSync("./newPstatements/problem_"+qnum+".txt", "utf-8");
       text=text.replace(/<br><h4>Input/g, "<h4>Input");
      text=text.toString();
      let problem={
        title: titles[qnum-1],
        url: urls[qnum-1].toLowerCase(),
        statement: text,
        id:qnum
      }
      arr.push(problem);
    }
    res.json(arr);
  // }, 10);
});

//Assigning Port to our application
app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
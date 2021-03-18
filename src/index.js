console.log("Map of Proof of Humanity Loading...");
import * as axios from 'axios';
import * as vis from 'vis-network';

async function queryData(url, query){
    console.log("Querying The Graph...")
    let data = axios.post(url, {query: query})
        .then((response)=>{
            // console.log(response.data);
            return response.data;
        })
        .catch((error)=>{
            console.log(error);
            return false;
        })
    return data;
}

async function buildNodesEdges(data){
    let nodes = [];
    let edges = [];
    console.log("Building Nodes and Edges...")
    for (var i = 0; i < data.data.submissions.length; i++) {
        // console.log("Loading: ", i, " of ", data.data.submissions.length-1);
        
        let url = data.data.submissions[i].requests[0].evidence[0].URI;
        // let content = loadContent(url);
       
        try{
            for (var j = 0; j < data.data.submissions[j].vouchees.length; j++) {
                let edge = {
                    "from": data.data.submissions[i].id,
                    "to": data.data.submissions[i].vouchees[j].id
                }
                edges.push(edge);
            }
        }catch(e){
            //unregistered vouchee nodes dont exist yet so cant be linked to.
            // console.log(e);

        } 

        let node = {
            "id": data.data.submissions[i].id,
            "label": data.data.submissions[i].name,
            "status": data.data.submissions[i].status,
            "registered": data.data.submissions[i].registered,
            "image": "",
            // "firstName": content.firstName,
            // "lastName": content.lastName,
            // "bio": content.bio,
            // "image": content.image,
            // "video": content.video
        }

        nodes.push(node);

    }
    return {"nodes":nodes, "edges":edges};
}

function loadContent(url){
    let ipfs_kleros = "https://ipfs.kleros.io";

    let content = {
        firstName: "",
        lastName: "",
        bio: "",
        image: "",
        video: ""
    }
    if(url == undefined || url == null){
        return content;
    }

    axios.get(ipfs_kleros+url)
        .then((response)=>{
            axios.get(ipfs_kleros+response.data.fileURI)
                .then((response)=>{
                    content = {
                        firstName: response.data.firstName,
                        lastName: response.data.lastName,
                        bio: response.data.bio,
                        image: ipfs_kleros+response.data.photo,
                        video: ipfs_kleros+response.data.video
                    } 
                })
                .catch((error)=>{
                    console.log("89",error);
                })
        })
        .catch((error)=>{
            console.log("93",error);
        })

    return content;
}

function drawDiagram(data){
    let options = {
        nodes: {
          shape: "dot",
          size: 16,
          color: "purple",
          shape: "circularImage"
        },
        physics: {
          forceAtlas2Based: {
            gravitationalConstant: -26,
            centralGravity: 0.005,
            springLength: 230,
            springConstant: 0.18,
          },
          maxVelocity: 100,
          solver: "forceAtlas2Based",
          timestep: 0.15,
          stabilization: { iterations: 50 },
        },
      };
    let network = new vis.Network(document.getElementById("diagram"), data, options);
}

//---------------------------------------------------------------------------------
let url = "https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet";
// 
// let query = "{submissions(orderBy: creationTime) {id status registered name vouchees{id}}}";
let query = "{submissions(where:{registered:true}) {id status registered name vouchees{id} requests{evidence{sender URI}}}}";
let graphData = [];
let structuredData = [];

async function main() {
    graphData = await queryData(url, query);
    console.log("Graph Data:", graphData);
    structuredData = await buildNodesEdges(graphData);
    console.log("Structured Data:", structuredData);
    drawDiagram(structuredData);
};

main();


import * as axios from 'axios';
import * as vis from 'vis-network';

class Diagram {
    constructor(){
        console.log("Constructing...");
        this.element = document.getElementById("diagram");
        this.graphURL = "https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet";
        this.graphQuery = "{submissions(where:{registered:true}) {id status registered name vouchees{id} requests{evidence{sender URI}}}}";
        this.graphData = [];
        this.structuredData = [];
        this.ipfs_kleros = "https://ipfs.kleros.io";
    }

    async loadGraphData(){
        console.log("Querying Graph Data...");
        this.graphData = await axios.post(this.graphURL, {query: this.graphQuery})
            .then((response)=>{
                return response.data;
            })
            .catch((error)=>{
                console.log(error);
                return false;
            })
        console.log("GRAPH DATA : ",this.graphData);
    }


    async structureData(){
        console.log("Structuring Data...");
        let nodes = [];
        let edges = [];
        for (var i = 0; i < this.graphData.data.submissions.length; i++) {
            try{
                for (var j = 0; j < this.graphData.data.submissions[j].vouchees.length; j++) {
                    let edge = {
                        "from": this.graphData.data.submissions[i].id,
                        "to": this.graphData.data.submissions[i].vouchees[j].id
                    }
                    edges.push(edge);
                }
            }catch(e){
                //unregistered vouchee nodes dont exist yet so cant be linked to.
                // console.log(e);
            } 
            let node = {
                "id": this.graphData.data.submissions[i].id,
                "label": this.graphData.data.submissions[i].name,
                "status": this.graphData.data.submissions[i].status,
                "registered": this.graphData.data.submissions[i].registered,
                "requests": this.graphData.data.submissions[i].requests,
                "firstName": "",
                "lastName": "",
                "bio": "",
                "image": "img/placeholder.png",
                "video": ""
            }
            nodes.push(node);
        }
        this.structuredData = {"nodes":nodes, "edges":edges};
        // console.log("STRUCTURED DATA : ", this.structuredData); 
        return this.structuredData;
    }


    async addContent(){
        console.log("Adding Content...");
        for(var i = 0; i < this.structuredData.nodes.length; i++) {
            // console.log(this.structuredData.nodes[i]);
            try{
                if(this.structuredData.nodes[i].requests[0].evidence[0].URI ==  undefined){
                    break;
                }

                // console.log(this.ipfs_kleros+this.structuredData.nodes[i].requests[0].evidence[0].URI);
                let res = await axios.get(this.ipfs_kleros+this.structuredData.nodes[i].requests[0].evidence[0].URI)
                    .then(async(response)=>{
                        let res2 = await axios.get(this.ipfs_kleros+response.data.fileURI)
                            .then((response)=>{
                                this.structuredData.nodes[i].firstName = response.data.firstName;
                                this.structuredData.nodes[i].lastName = response.data.lastName;
                                this.structuredData.nodes[i].bio = response.data.bio;
                                this.structuredData.nodes[i].image = this.ipfs_kleros+response.data.photo;
                                this.structuredData.nodes[i].video = this.ipfs_kleros+response.data.video;
                            })
                            .catch((error)=>{
                                // console.log("75",error);
                                console.log("error loading human's image!");
                            })
                    })
                    .catch((error)=>{
                        // console.log("79",error);
                        console.log("error loading human's image!");
                    })

            }catch(error){
                // console.log(error);
                console.log("error loading human's image!");
            }
        } 
        // console.log("UPDATED STRUCTURED DATA : ",this.structuredData);
        return this.structuredData;
    }

    draw(data){
        console.log("Drawing...");
        let drawingOptions = {
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
        let network = new vis.Network(document.getElementById("diagram"), data, drawingOptions);
        // console.log(network);
    }
}

//-------------------------------------------------
async function run(){
    let diagram = new Diagram();
    console.log("------------------------------------")
    let lData = await diagram.loadGraphData();
    console.log("------------------------------------")
    let sData = await diagram.structureData();
    console.log("------------------------------------")
    let data = await diagram.addContent();
    console.log("------------------------------------")
    diagram.draw(diagram.structuredData);
    
    
}

console.log("Map of Proof of Humanity Loading...");
run();
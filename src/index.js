import * as axios from 'axios';
import * as vis from 'vis-network';
import * as ethers from 'ethers';

class Diagram {
    constructor(){
        console.log("Constructing...");
        this.element = document.getElementById("diagram");
        this.graphURL = "https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet";

        this.graphQuery = "{submissions(first:1000){id status registered name vouchees{id} requests{evidence{sender URI}}}}";

        this.graphData = [];
        this.structuredData = [];
        this.ipfs_kleros = "https://ipfs.kleros.io";
        // this.provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/f243bc81cdd44e2ebf78f3b8dac5c03b");
        // this.ubiAddress = "0xdd1ad9a21ce722c151a836373babe42c868ce9a4";
        // this.ubiAbi = [
        //     "function name() view returns (string)",
        //     "function symbol() view returns (string)",
        //     "function balanceOf(address) view returns (uint)",
        // ]
        // this.ubiContract = new ethers.Contract( this.ubiAddress, this.ubiAbi, this.provider);
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

    containsObject(obj, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i] === obj) {
                return true;
            }
        }

        return false;
    }

    async structureData(){
        console.log("Structuring Data...");
        let nodes = [];
        let edges = [];
        for (var i = 0; i < this.graphData.data.submissions.length; i++) {
            // console.log(this.graphData.data.submissions[i]);
            let submission = this.graphData.data.submissions[i];
            let node = {
                "id": submission.id,
                "label": submission.name,
                "status": submission.status,
                "registered":submission.registered,
                "requests": submission.requests,
                "firstName": "",
                "lastName": "",
                "bio": "",
                "image": "img/placeholder.png",
                "video": "",
                "balance": 1
            }

            if(this.containsObject(nodes, node) == false){

                nodes.push(node);
            }else{
                console.log("NODE IS IN LIST");
            }
            
            try{
                for (var j = 0; j < submission.vouchees.length; j++) {
                    let vouchee = submission.vouchees[j];
                    let edge = {
                        "from": node.id,
                        "to": vouchee.id
                    }
                    // console.log("EDGE", edge)
                    edges.push(edge);
                }
            }catch(e){
                //unregistered vouchee nodes dont exist yet so cant be linked to.
                console.log(e);
            } 
        }
        this.structuredData = {"nodes":nodes, "edges":edges};
        console.log("STRUCTURED DATA : ", this.structuredData); 
        return this.structuredData;
    }


    async addContent(){
        console.log("Adding Content...");
        for(var i = 0; i < this.structuredData.nodes.length; i++) {
            // console.log(this.structuredData.nodes[i]);
            // try{
            //     let balance = await this.ubiContract.balanceOf(this.structuredData.nodes[i].id)
            //     this.structuredData.nodes[i].balance = ethers.utils.formatUnits(balance.toString(), 'wei')/18;
            //     console.log("balance", this.structuredData.nodes[i].balance);
            // }catch(error){
            //     console.log("error getting balanceOf", error);
            // }
                    

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
                                console.log("error loading human's image!");
                            })
                    })
                    .catch((error)=>{
                        console.log("error loading human's image!");
                    })

            }catch(error){
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
                timestep: 0.5,
                stabilization: { iterations: 50 },
            },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 1, type: "arrow" }
                }
            }
        };
        let network = new vis.Network(document.getElementById("diagram"), data, drawingOptions);
        // console.log(network);

    }

}

//-------------------------------------------------
async function run(){
    let diagram = new Diagram();
    console.log("------------------------------------")
    // console.log("provider:", diagram.provider);
    diagram.loadGraphData().then((graphdata)=>{
        diagram.structureData().then((structureddata)=>{
            diagram.draw(structureddata)
        })
    })   
}

console.log("Map of Proof of Humanity Loading...");
run();
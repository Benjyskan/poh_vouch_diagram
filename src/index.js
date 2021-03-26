import * as axios from 'axios';
import * as vis from 'vis-network';
import * as ethers from 'ethers';
import * as $ from 'jquery';

class Diagram {
    constructor(){
        console.log("Constructing...");
        this.element = document.getElementById("diagram");
        this.graphURL = "https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet";

        this.graphQuery = "{submissions(first:1000){id status registered name vouchees{id} requests{evidence{sender URI}}}}";

        this.graphData = [];
        this.structuredData = [];
        this.ipfs_kleros = "https://ipfs.kleros.io";

        this.ubiAddress = "0xdd1ad9a21ce722c151a836373babe42c868ce9a4";
        this.ubiAbi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function balanceOf(address) view returns (uint)",
        ]
        this.ubiContract = new ethers.Contract( this.ubiAddress, this.ubiAbi, this.provider);

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
                "image": "img/vouching.png",
                "video": "",
                "balance": 1,
                "color": "orange"
            }
            if(node.status == "None" && node.registered == false){
                // console.log("Deleted Node ???", node);
                // node isnt registered, but isnt in vouching, assume deleted?
                node.color = "red";
                node.image = "img/danger.png";
            }else if(node.registered){
                // node is registered
                node.color = "orange";
                node.image = "img/registered.png";
            }else if(node.status =="PendingRegistration"){
                // node isnt registered
                node.color = "purple";
                node.image = "img/pending.png"
            }else{
                node.color = "grey";
            }
            // if(node.registered == false && submission.vouchees.length >0){
            //     console.log(node);
            // }
            
            nodes.push(node);
            
            for (var j = 0; j < submission.vouchees.length; j++) {
                let vouchee = submission.vouchees[j];
                let edge = {
                    "from": node.id,
                    "to": vouchee.id
                }
                // console.log("EDGE", edge)
                edges.push(edge);
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
                // color: "purple",
                // parseColor: true,
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
        this.network = new vis.Network(document.getElementById("diagram"), data, drawingOptions);
        // console.log(network);
        this.registerEvents();
    }

    async getProfile(node){
        
        let res = await axios.get(this.ipfs_kleros+node.requests[0].evidence[0].URI)
            .then(async(response)=>{
                let res2 = await axios.get(this.ipfs_kleros+response.data.fileURI)
                    .then((response)=>{
                        // console.log(response.data);
                        return response.data;
                    })
                    .catch((error)=>{
                        console.log("error loading human's image!");
                        return false;
                    })
                return res2;
            })
            .catch((error)=>{
                console.log("error loading human's image!");
                return false;
            })

        return res;
    }

    // async getUBIBalance(address){
    //     let bal = await this.ubiContract.balanceOf(address).then((res)=>{
    //         console.log(res)
    //         return res.toString();
    //     });
    //     return bal;
        
    // }

    showNodeDetails(nodeID){
        console.log("Finding Node...");
        let node = this.structuredData.nodes.find(x => x.id === nodeID);
        //set the placeholder image between loading
        $('#details_image').attr('src', node.image);
        this.getProfile(node).then((data)=>{
            console.log(data);
            node.firstName = data.firstName;
            node.lastName = data.lastName;
            node.bio = data.bio;
            node.image = this.ipfs_kleros+data.photo;
            node.video = this.ipfs_kleros+data.video;
            $('#details_image').attr('src', node.image);
            $('#details_name').html(node.label);
            $('#details_address').html(node.id);
            $('#details_registered').html(node.registered);
            $('#details_status').html(node.status);
            $('#details_bio').html(node.bio);

            if(node.id == "0x601729acddb9e966822a90de235d494647691f1d"){
                console.log("👋 Vouch for me -> https://app.proofofhumanity.id/profile/0x601729acddb9e966822a90de235d494647691f1d?network=mainnet");
            }
            // this.getUBIBalance(nodeID).then((balance)=>{
            //     console.log("bal", balance);
            //     node.balance = balance;
            //     $('#details_ubi').html(balance);
            // })
            //ADD A LINK THROUGH TO PROOFOFHUMANITY.ID PROFILE? 
            $('#sidebar').show();
        });

    }

    registerEvents(){
        console.log("Registering Events...");
        this.network.on('click', (params)=>{
            $('#sidebar').hide();
            if(params.nodes[0]){
                this.showNodeDetails(params.nodes[0]);
            }
        });
    }
}

//-------------------------------------------------
async function run(){
    let diagram = new Diagram();
    console.log("------------------------------------")
    diagram.loadGraphData().then((graphdata)=>{
        diagram.structureData().then((structureddata)=>{
            diagram.draw(structureddata);
            console.warn("👋 Vouch for me -> https://app.proofofhumanity.id/profile/0x601729acddb9e966822a90de235d494647691f1d?network=mainnet");
        })
    })   
}

console.log("Map of Proof of Humanity Loading...");
run();
import * as axios from 'axios';
import * as vis from 'vis-network';
// import * as ethers from 'ethers';
import * as $ from 'jquery';
// import Web3 from 'web3';
// import Web3Modal from 'web3modal';
import ForceGraph3D from '3d-force-graph';

class Diagram {
    constructor(){
        console.log("Constructing...");
        // this.profile_id = new URLSearchParams(window.location.search).get('profile_id');
        // if(typeof this.profile_id == 'undefined')
        this.profile_id = false;
        this.element = document.getElementById("diagram");
        this.graphURL = "https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet";

        this.graphQuery = "{submissions(first:1000){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}";

        this.graphData = [];
        this.structuredData = [];
        this.ipfs_kleros = "https://ipfs.kleros.io";

        this.ubiAddress = "0xdd1ad9a21ce722c151a836373babe42c868ce9a4";
        this.ubiAbi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function balanceOf(address) view returns (uint)",
        ]
        // this.ubiContract = new ethers.Contract( this.ubiAddress, this.ubiAbi, this.provider);

        this.minTime = 1615432000;
        this.maxTime = Math.floor(Date.now() / 1000);
        this.selectedTime = this.maxTime;
        // this.setSliderRange();
    }
    
    setSliderRange(){
        console.log("Setting Slider Range...")
        $('#timewarp').attr('min',  this.minTime);
        $('#timewarp').attr('max',  this.maxTime);
        $('#timewarp').attr('value', this.selectedTime);
        var date = new Date(this.selectedTime * 1000);
        $('#timewarpLabel').html(date.toDateString());
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

    async singleProfile(){
        console.log("Querying Single User Graph Data...");
        let graphQuery = '{submission(id:"'+this.profile_id+'"){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}';
        console.log(graphQuery)
        this.graphData = await axios.post(this.graphURL, {query: graphQuery})
            .then((response)=>{
                return response.data;
            })
            .catch((error)=>{
                console.log(error);
                return false;
            })
        console.log("GRAPH DATA : ",this.graphData);
    }

    async multiLoadGraphData(){
        let query1000 = "{submissions(first: 1000, skip:"+0+"){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}";
        let query2000 = "{submissions(first: 1000, skip:"+1000+"){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}";
        let query3000 = "{submissions(first: 1000, skip:"+2000+"){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}";

        let data = await axios.post(this.graphURL, {query: query1000})
            .then(async (response)=>{
                let response2 = await axios.post(this.graphURL, {query: query2000})
                    .then((res)=>{
                        // console.log(res.data);
                        return res;
                    })
                    .catch((error)=>{
                        console.log(error);
                        return false;
                    })
                let response3 = await axios.post(this.graphURL, {query: query3000})
                    .then((res)=>{
                        // console.log(res.data);
                        return res;
                    })
                    .catch((error)=>{
                        console.log(error);
                        return false;
                    })

                let data = {"submissions":[]};
                for (var i = 0; i < response.data.data.submissions.length; i++) {
                     data["submissions"].push(response.data.data.submissions[i]);
                }
                
                for (var i = 0; i < response2.data.data.submissions.length; i++) {
                     data["submissions"].push(response2.data.data.submissions[i]);
                }

                for (var i = 0; i < response3.data.data.submissions.length; i++) {
                     data["submissions"].push(response3.data.data.submissions[i]);
                }
                return data
            })
            .catch((error)=>{
                console.log(error);
                return false;
            })
        this.graphData = {"data": data};
        console.log("MULTI QUERY GRAPH DATA : ",this.graphData);

    }

    async structureData(){
        console.log("Structuring Data...");
        let nodes = [];
        let edges = [];
        for (var i = 0; i < this.graphData.data.submissions.length; i++) {
            // console.log(this.graphData.data.submissions[i]);
            let submission = this.graphData.data.submissions[i];
            // console.log(submission.name);
            // 
            let node = {
                "id": submission.id,
                "label": submission.name,
                "status": submission.status,
                "registered":submission.registered,
                "requests": submission.requests,
                "creationTime": submission.creationTime,
                "submissionTime": submission.submissionTime,
                "firstName": "",
                "lastName": "",
                "bio": "",
                "image": "img/vouching.png",
                "video": "",
                "balance": 1,
                "color": "orange",
                "hidden": false
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
                // let edge = {
                //     "from": node.id,
                //     "to": vouchee.id
                // }
                //USES SOURCE TARGET IN 3D NOT TO FROM

                let edge = {
                    "source": node.id,
                    "target": vouchee.id
                }
                // console.log("EDGE", edge)
                edges.push(edge);

                
            }
        }

        // this.structuredData = {"nodes":nodes, "edges":edges};
        // USES "LINKS" FOR 3D not edges

        this.structuredData = {"nodes":nodes, "links":edges};
        console.log("STRUCTURED DATA : ", this.structuredData); 
        return this.structuredData;
    }


    changeTime(time){
        console.log("Changing Time...");
        this.selectedTime = time;
        this.updateNodeVisibility();
        this.network.setData(this.structuredData);
        this.network.redraw();
        var date = new Date(this.selectedTime * 1000);
        $('#timewarpLabel').html(date.toDateString());
    }

    updateNodeVisibility(){
        console.log("Updating Node Visibility...")
        let active = 0;
        for (var i = 0; i < this.structuredData.nodes.length; i++) {
            if(this.selectedTime >= this.structuredData.nodes[i].creationTime){
                this.structuredData.nodes[i].hidden = false;
                active +=1;
            }else{
                this.structuredData.nodes[i].hidden = true;
            }
        }
        console.log("active:"+active+" at time:"+this.selectedTime);
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
                    // gravitationalConstant: -26,
                    centralGravity: 0.005,
                    springLength: 200,
                    springConstant: 0.18,
                },
                maxVelocity: 200,
                solver: "repulsion",
                timestep: 0.5,
                stabilization: { iterations: 150 }
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

    draw3D(data){

        this.threeDGraph = ForceGraph3D()
      (document.getElementById('diagram'))
        .graphData(data)
        .backgroundColor("#fffffa")
        .width('100vw')
        .height('100vw')
        .linkColor(() => 'purple')
        .nodeAutoColorBy('status')
        .nodeThreeObject(node => {
          const sprite = new SpriteText(node.label);
          sprite.material.depthWrite = false; // make sprite background transparent
          sprite.color = node.color;
          sprite.textHeight = 8;
          return sprite;
        })
        .onNodeClick(node => {
          const distance = 100;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

          this.threeDGraph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
          );
        });

        // this.threeDGraph = ForceGraph3D();
        // this.threeDGraph(document.getElementById("diagram")).graphData(data);
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

        // $('#timewarp').show();
        // $('#timewarp').on('change', ()=>{
        //     this.changeTime($('#timewarp').val());
        // })    
    }

}

//-------------------------------------------------
async function run(){
    let diagram = new Diagram();
    console.log("------------------------------------")
    diagram.multiLoadGraphData().then((graphdata)=>{
        diagram.structureData().then((structureddata)=>{
            diagram.draw3D(structureddata);
        })
    })
}


// const profile_id =  new URLSearchParams(window.location.search).get('profile_id');
// console.log(profile_id)
console.log("Map of Proof of Humanity Loading...");
run();

import React from 'react';
import io from 'socket.io-client' 
import {Cookies} from "react-cookie";
import './App.css'
import $ from 'jquery'

let moment = require('moment');
let cookies = new Cookies();
class Chatroom extends React.Component{

    constructor(props) {
        super(props);
        // Initial state for a client 
        // Colour is always black
        // Checks for cookies first
        this.state = {
            name: cookies.get('name'),
            color: "black",
            message: "",
            users: [],
            messages: [],
        }

        this.sendMessage = this.sendMessage.bind(this);
        this.handleKeyboard = this.handleKeyboard.bind(this);

        this.socket = io(process.env.PORT||'localhost:3001')
        
        // If theres no cookie stored, request for a random username from server
        // Else, add that user back to the users list
        if (this.state.name === undefined) {
            console.log("USER UNDEFINED")
            this.socket.on('SEND_USERNAME', (data) => {
                this.setState({
                    name: data
                })
                this.socket.emit('NEW_USER', data)
                cookies.set('name', data, { path: '/', expires: d});
            })
            this.socket.on('NEW_USER', (data) => {
                this.setState ({
                    users: data
                })
            })

            let d = new Date();
            d.setTime(d.getTime() + (100000));

            
        }
        else {
            console.log("NAME FOR RETURNING USER" + this.state.name)
            this.socket.emit('RETURNING_USER', this.state.name)
        }

        this.socket.on('GET_USERS', (data) => {
            this.setState ({
                users: data
            })
        })



        
        console.log("Cookie has stored: " + cookies.get('name')); 

        // Receive the list of previous messages in the chat
        // These messages are by the past users.
        this.socket.on('LIST_OF_PREV_MSG', (data) => {
            let i = 0
            console.log(data)
            if (data[0]!==null) {
                let prevUsers = []
                while (i<data.length) {
                    data[i].time = moment(data[i].time).local().format('HH:mm')
                    prevUsers = [...prevUsers, data[i].name]
                    i++;
                }
                
                this.setState({
                    messages: data,
                    users: [...this.state.users, prevUsers]
                })
            }

        })

        // Display a message when it arrives from another user
        this.socket.on('RECEIVE_MESSAGE', (data)=> {
            console.log(data.color);
            data.time = moment(data.time).local().format('HH:mm')
            this.setState({
                messages: [...this.state.messages, data]
            })
        })

        // Update the list when someone has left
        this.socket.on('SOMEONE_LEFT', (data) => {
            this.setState ({
                users: data
            })
        })

    }

    handleKeyboard(e) {
        e.preventDefault();
        this.setState ({
            message: e.target.value
        })
    }

    sendMessage(e) {
        e.preventDefault();
        // Handle slash commands first
        if (this.state.message.substring(0,1)==="/") {
            if (this.state.message.substring(0,6)==="/nick ") {
                //first parse new username
                //if username exists, then check to see if its unique first
                //if that went well, then change it
                let newNickName = this.state.message.substring(6);
                this.socket.emit('VERIFY', {newName: newNickName, old:this.state.name})
                this.socket.on('VERIFY', (data) => {
                    if (data === true) {
                        this.setState ({
                            name: newNickName
                        })
                        let d = new Date();
                        d.setTime(d.getTime() + (100000));
            
                        cookies.set('name', this.state.name, { path: '/', expires: d});
                    }
                    else {
                        alert("That username is taken!")
                    }
                })
            }
            else if (this.state.message.substring(0,11)==="/nickcolor ") {
                let newColor = this.state.message.substring(11)
                this.socket.emit('COLOR', {name: this.state.name, color: newColor})
                this.setState ({
                    color: newColor
                })
            }
            else {
                alert("Wrong Command entered, use /nick <name> or /nickcolor <color>")
            }
        }
        // If its not a slash command, then send it as a message
        else {        
            this.socket.emit('SEND_MESSAGE', {
                author: this.state.name,
                message: this.state.message,
                time: "",
                color: this.state.color
        })}
        this.setState({
            message: ""
        })
    }

    render(){
        // $("#messages").scrollTop($('#messages').height())
        let scrollBottom = $("messages").scrollTop() + $("messages").height();

        return (
            <div className="container">
                <div id="chatBox" className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <div className="card-title">
                                    <h2>React Chat Room</h2>
                                </div>
                                <div className="card-title">
                                    <h4>You are {this.state.name}</h4>
                                </div>
                                <hr/>
                                <div id="allMessages" className="messages">
                                <div>
                                    <ul>
                                        {this.state.messages.map((item, i) => {
                                            let chatColor = item.color
                                            const colorStyle = {
                                                color: chatColor
                                            }
                                            if (item.author === this.state.name)
                                                return <li key={i} style={colorStyle}>{item.time} <b>{item.author}</b>: {item.message}</li>
                                            else
                                                return <li key={i} style={colorStyle}>{item.time} <i>{item.author}</i>: {item.message}</li>
                                        })}
                                    </ul>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer">
                                <form className="form-inline" onSubmit={this.sendMessage}>
                                    <input type="text" placeholder="Message" className="form-control" value={this.state.message} onChange={this.handleKeyboard} />
                                    <button className="btn btn-primary">Send</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="users" className="row">
                    <div className="col-12">
                        <div className="card">
                              <div className="card-body">
                                <h4>List of Users</h4>
                                    <ul>
                                        {this.state.users.map((item, i) => {
                                            console.log(item)
                                            return <li key={i}><h6>{item[1]}</h6></li>
                                        })}
                                    </ul>
                              </div>  
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Chatroom;
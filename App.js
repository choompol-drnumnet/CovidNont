import * as React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {useState,useEffect} from 'react';
import { Button, Vibration, Dimensions } from 'react-native';
import { Image, ImageBackground, TextInput } from 'react-native';
import { TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { Notifications } from 'expo';
import * as Permissions from 'expo-permissions';
import Constants from 'expo-constants';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase("DB8.db");
const tbnm = "tb106";

const MODE_HOME = 1;
const MODE_SCAN = 3;
const MODE_SUCC = 2;

const newAppId = () => {
  const str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
  var d = new Date();
  var yy = d.getFullYear();
  var ms = d.getMilliseconds();
  var tmst = str.charAt(yy/64) + str.charAt(yy%64)
           + str.charAt(d.getMonth()) + str.charAt(d.getDate())+"-"
           + str.charAt(d.getHours()) + str.charAt(d.getMinutes())
           + str.charAt(d.getSeconds())
           + str.charAt(ms/64) + str.charAt(ms%64)
  ;
  return "CVN-"+tmst;
}

const initDb = async (tx) => {
  const aid = newAppId();
  console.log("INIT DB");
  //let r1 = await tx.executeSql('drop table if exists tb1');
  let r1 = await tx.executeSql('delete from tb1');
  let r2 = await tx.executeSql('create table if not exists tb1(name varchar(80), phone varchar(15), fever numeric(6,2), staff char(1))');
  let r3 = await tx.executeSql("insert into tb1(name,phone,fever,staff,appid) values('A','A','A','A')");
  let r4 = await tx.executeSql("select name,phone,fever,staff from tb1");
  console.log("INITING", r1, r2, r3,r4);
};

const App = () => {
  const [expTok, setExpTok] = useState('');
  const [notify, setNotify] = useState('');
  const wd = Math.round(Dimensions.get('window').width);
  const hg = Math.round(Dimensions.get('window').height);

  const [appId, setAppId] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [pname, setPname] = useState('?');
  const [phone, setPhone] = useState('?');
  const [pfever, setPfever] = useState('N');
  const [pstaff, setPstaff] = useState('N');
  const [mode, setMode] = useState(1);
  const [wrongName, setWrongName] = useState(false);
  const [wrongPhone, setWrongPhone] = useState(false);
  const [wrongFever, setWrongFever] = useState(false);
  const [wrongStaff, setWrongStaff] = useState(false);

  const [stType, setStType] = useState('');

  const regExpNotify = async () => {
    if (Constants.isDevice) {
      const { status: state0 } = await 
        Permissions.getAsync(Permissions.NOTIFICATIONS);
      let state1 = state0;
      if (state0 !== 'granted') {
        const { state2 } = await 
          Permissions.askAsync(Permissions.NOTIFICATIONS);
        state1 = state2;
      }
      if (state1 !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      let tok0 = await Notifications.getExpoPushTokenAsync();
      console.log("PUSH :"+tok0);
      setExpTok(tok0);
    } else {
      alert('Must use physical device for Push Notifications');
    }
    if (Platform.OS === 'android') {
      Notifications.createChannelAndroidAsync('default', {
        name: 'default',
        sound: true,
        priority: 'max',
        vibrate: [0, 250, 250, 250],
      });
    }
  };
  const mgtop = 5;
  const hgtxt = (hg*7/100);
  const pos01 = (hg*38/100);
  const expNotify = (n) => {
    Vibration.vibrate();
    setNotify(n.data.msg);
  };
  useEffect(() => {
    regExpNotify();
    const expNotSub = Notifications.addListener(expNotify);
  },[]);
  //========== BARCODE CAMERA PREP
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    let s1 = "select name,phone,fever,staff,appid from "+tbnm;
    db.transaction(tx => {
      tx.executeSql(s1, [], (_, { rows }) => {
          const aid = rows._array[0].appid;
          //console.log("APPID: ", aid);
          setPname(rows._array[0].name);
          setPhone(rows._array[0].phone);
          setPfever(rows._array[0].fever);
          setPstaff(rows._array[0].staff);
          setAppId(aid);
      }, (_, e1) => {
        const aid = newAppId();
        let s2 = "create table if not exists "+tbnm+" (name varchar(80)"
      + ",phone varchar(15),fever char(1),staff char(1),appid varchar(20))";
        let s3 = "delete from "+tbnm;
        let s4 = "insert into "+tbnm+"(name,phone,fever,staff,appid)"
               + "values ('','','','','"+aid+"')";
        tx.executeSql(s2, [], ()=>{
          tx.executeSql(s3, [], ()=>{
            tx.executeSql(s4, [], ()=>{
              setAppId(aid);
              //console.log("SUCCESS");
            }, (_,e4)=>{
              console.log("ER4", e4);
            });
          }, (_,e3)=>{
            console.log("ER3", e3);
          });
        }, (_,e2)=>{
          console.log("ER2",e2);
        });
      })
     });

  },[]);
  //========== DATA VALIDATE AND SAVE
  useEffect(() => {
    let wNm = false;
    if(pname==='' || pname.length==0) wNm = true;
    setWrongName(wNm);

    let wPh = false;
    if(phone==='' || phone.length<5) wPh = true;
    setWrongPhone(wPh);

    let wFv = true;
    if(pfever=='1' || pfever=='2') wFv = false;
    setWrongFever(wFv);

    let wSt = true;
    if(pstaff=='1' || pstaff=='2') wSt = false;
    setWrongStaff(wSt);

    if(!wNm && !wPh && !wFv && !wSt) {
      //console.log("SAVE DATA", pname, phone, pfever, pstaff);
      let s5 = "update "+tbnm+" set name=?,phone=?,fever=?,staff=?";
      db.transaction(tx=>{
        tx.executeSql(s5, [pname, phone, pfever, pstaff], ()=>{
          //console.log("SAVE SUCCESS !!!");
        });
      });
     }
  },[pname,phone,pfever,pstaff]);

  let fgSnd = 0;

  const handleBarCodeScanned = async ({ type, data }) => {
    if(!data.startsWith("covnon:")) return;
    if(fgSnd>0) return;
    fgSnd++;
    //console.log("SEND 2: ", fgSnd, data);
    let u0 = "https://ssjnonthaburi.moph.go.th/covidscan/mod_token/mod_server_temp.php";
    
    let cd = data;
    let nm = pname;
    let ph = phone;
    let tp = pstaff;
    let fe = pfever;

    if(pstaff=='1') tp = '1';
    else tp = '2';
    if(pfever=='1') fe = 'Y';
    else fe = 'N';

    //console.log("APPID", appId);
    let url = u0 + "?COMPANYCODE=" + cd + "&NAME="+ nm
       + "&PHONE="+ ph + "&TYPE=" + tp + "&TEMP="+ fe 
       + "&APPID="+appId+ "&TOKEN="+ expTok;

    console.log("URL:",url);
    fetch(url, { method: 'GET', }) 
    .then((resp) => {
      fgSnd = 0;
      return resp.text(); 
    })
    .then((text) => {
      fgSnd = 0;
      setMode(2);
      setTimeout(()=>setMode(1), 2000);
    })
    .catch((err) => {
      fgSnd = 0;
      console.log("ERROR", err);
    });
  }

  return (

    <ImageBackground source={require("./assets/background.jpg")}
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'stretch',
      }}>
      {mode===1 &&

      <KeyboardAvoidingView 
        style={{width: '100%', alignItems: 'center'}}
        behavior="padding" enabled
      >
      <View style={{
        marginTop: pos01,
        height: '57%',
        marginHorizontal: (hg*2/100),
        flexDirection: 'column',
        alignItems: 'flex-start',
       }}>

        <View style={{
          width: (wd*60/100),
          height: hgtxt,
          marginTop: 20,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          }}>
          <TouchableOpacity onPress={()=>{ 
              // ============== PUSH SCAN
              fgSnd = 0;
              setMode(3);
              setTimeout(()=>setMode(1), 10000);
            }}>
            <Text style={{
              paddingVertical: 3,
            }}>แสกนคิวอาร์โค้ด</Text>
          </TouchableOpacity>
        </View>

        <View style={{
          marginTop: 20,
          marginLeft: 20,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          }}>
          <Text style={{
              alignSelf: 'center',
              padding: 5,
            }}>ชื่อ</Text>
          <TextInput style={{
              padding: 5,
              marginVertical: 2,
              marginHorizontal: 5,
              width: '80%',
              backgroundColor: 'white',
            }} maxLength={50}
            autoCapitalize="none" autoCorrect={false}
            onChangeText={(v)=>{ setPname(v); }} value={pname}
            />
        </View>

        <View style={{
          marginTop: mgtop,
          marginLeft: 20,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          }}>
          <Text style={{
              alignSelf: 'center',
              padding: 5,
            }}>โทร</Text>
          <TextInput style={{
              padding: 5,
              marginVertical: 2,
              marginHorizontal: 5,
              width: '60%',
              backgroundColor: 'white',
            }} maxLength={50}
            autoCapitalize="none" autoCorrect={false}
            onChangeText={(v)=>{ setPhone(v); }} value={phone}
            />
        </View>

        <View style={{
          height: hgtxt,
          marginTop: mgtop,
          marginLeft: 20,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          }}>
          <TouchableOpacity onPress={()=>{ 
              // ============== PUSH SELLER
              setPstaff('1');
              //console.log("SELLER");
            }}>
            <Text style={{
              marginVertical: 2,
              marginHorizontal: 5,
              paddingHorizontal: 20,
              paddingVertical: 2,
              color: (pstaff=='1'? 'blue':'black'),
              backgroundColor: (pstaff=='1'? 'white':'lightgrey'),
              borderColor: (pstaff=='1'? 'blue':'white'),
              borderWidth: 1,
            }}>ผู้ให้บริการ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{ 
              // ============== PUSH BUYER
              setPstaff('2');
              console.log("BUYER");
            }}>
            <Text style={{
              marginVertical: 2,
              marginHorizontal: 5,
              paddingHorizontal: 20,
              paddingVertical: 2,
              color: (pstaff=='2'? 'blue':'black'),
              backgroundColor: (pstaff=='2'? 'white':'lightgrey'),
              borderColor: (pstaff=='2'? 'blue':'white'),
            }}>ผู้ใช้บริการ</Text>
          </TouchableOpacity>
        </View>

        <View style={{
          height: hgtxt,
          marginTop: mgtop,
          marginLeft: 20,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'lightblue',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          }}>
          <TouchableOpacity onPress={()=>{ 
              // ============== PUSH SELLER
              setPfever('1');
            }}>
            <Text style={{
              marginVertical: 2,
              marginHorizontal: 5,
              paddingHorizontal: 20,
              paddingVertical: 2,
              color: (pfever=='1'? 'blue':'black'),
              backgroundColor: (pfever=='1'? 'white':'lightgrey'),
              borderColor: (pfever=='1'? 'blue':'white'),
              borderWidth: 1,
            }}>มีไข้</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{ 
              // ============== PUSH BUYER
              setPfever('2');
            }}>
            <Text style={{
              marginVertical: 2,
              marginHorizontal: 5,
              paddingHorizontal: 20,
              paddingVertical: 2,
              color: (pfever=='2'? 'blue':'black'),
              backgroundColor: (pfever=='2'? 'white':'lightgrey'),
              borderColor: (pfever=='2'? 'blue':'white'),
            }}>ไม่มีไข้</Text>
          </TouchableOpacity>
        </View>

        {notify!=='' &&
        <View style={{
          marginTop: mgtop,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'red',
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'center',
          justifyContent: 'center',
          }}>
          <Text style={{
              color: 'white',
              marginVertical: 2,
              marginHorizontal: 5,
              paddingHorizontal: 20,
              paddingVertical: 2,
            }}>{notify}</Text>
        </View>}

      </View>
      </KeyboardAvoidingView>
      }
      {mode==2 && 
      <View style={{
        marginTop: pos01,
        height: '57%',
        marginHorizontal: (hg*2/100),
        flexDirection: 'column',
        alignItems: 'flex-start',
       }}>

        <View style={{
          width: (wd*60/100),
          height: hgtxt,
          marginTop: 20,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: 'white',
          backgroundColor: 'red',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          color: ((!wrongName && !wrongPhone && !wrongFever && !wrongStaff)? 'black' : 'gray'),
          }}>
          <TouchableOpacity onPress={()=>{ 
              // ============== PUSH SCAN
              if(!wrongName && !wrongPhone && !wrongFever && !wrongStaff) {
                fgSnd = 0;
                setMode(3);
                setTimeout(()=>setMode(1), 10000);
              }
            }}>
            <Text style={{
              color: 'white',
              paddingVertical: 3,
            }}>ส่งข้อมูลเสร็จแล้ว</Text>
          </TouchableOpacity>
        </View>
      </View>
      }
      {mode==3 &&
        <View style={{
          width: '100%',
          height: '100%',
          flex: 1,
          }}>
          <BarCodeScanner
            onBarCodeScanned = {handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject} /> 
          <View style={{
            width: (wd*60/100),
            height: hgtxt,
            marginTop: 20,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: 'white',
            backgroundColor: 'red',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            }}>
            <TouchableOpacity onPress={()=>{ fgSnd=0; setMode(1) }}>
              <Text style={{
                color: 'white',
                paddingVertical: 3,
              }}>ยกเลิกแสกน</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    </ImageBackground>
  );
}

export default App;


const express = require('express');
const { resolve } = require('path');
const multer = require('multer');
const { readFile } = require('fs-extra');
const { createHmac } = require('crypto');
const { sync } = require('del')
const AdmZip = require('adm-zip');

const upload = multer({ dest: './temp' });

const app = express();
const PORT = 25565;

const getHash = (data, type = 'sha512', key = "c3e343ddff957cec09fd") => {
    const hmac = createHmac(type, key);
    hmac.update(data);
    return hmac.digest('hex');
}


app.use(express.static(resolve(__dirname, "../wwwroot")));

app.post('/publish/myelectronapp', upload.fields([{ name: 'hotPkg', maxCount: 1 }, { name: 'fullPkg', maxCount: 1 }]), async (req, res) => {
    const checkHotPkgStatus = await checkFile(req.files['hotPkg'], req.body.hotPkgHash);
    const checkFullPkgStatus = await checkFile(req.files['fullPkg'], req.body.fullPkgHash);

    if (!checkFullPkgStatus || !checkHotPkgStatus) {
        res.send('校验文件失败！');
        res.end();
        return;
    }
    const { arch } = req.body;
    const savePath = resolve(__dirname, '../wwwroot', `${arch}`);

    try {
        await Promise.all([
            saveFile(savePath, req.files['hotPkg'][0].path),
            saveFile(savePath, req.files['fullPkg'][0].path),
        ]) 
        sync([req.files['hotPkg'][0].path, req.files['fullPkg'][0].path]);
    } catch(err) {
        sync([req.files['hotPkg'][0].path, req.files['fullPkg'][0].path]);
        console.log(err);
    }

    res.send('publish success!');
    res.end();
});

const checkFile = async (file, hash) => {
    let checkStatus = false;
    if (!file || !file[0]) {
        return checkStatus;
    }
    const { path } = file[0];
    const buffer = await readFile(path)
    const selfHash = getHash(buffer);
    if (hash !== selfHash) {
        sync(path);
        return checkStatus;
    }

    return checkStatus = true;
}

const saveFile = async (savePath, sourcePath) => {
    const zip = new AdmZip(sourcePath);
    zip.extractAllTo(savePath, true);
}

app.listen(PORT, err => {
    if (err) throw err;
    console.log(`app has listen in http://localhost:${PORT}`);
})
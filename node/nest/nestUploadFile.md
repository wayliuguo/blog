## 实现

```
nest new nest-multer-upload -p npm
npm install -D @types/multer
```

```
// app.controller.ts

import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UploadedFiles,
} from '@nestjs/common';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { AppService } from './app.service';
import { storage } from 'my-file-storage';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('aaa')
  @UseInterceptors(
    FileInterceptor('aaa', {
      dest: 'uploads',
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body) {
    console.log('body', body);
    console.log('file', file);
  }

  @Post('bbb')
  @UseInterceptors(
    FilesInterceptor('bbb', 3, {
      dest: 'uploads',
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);
  }

  @Post('ccc')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'aaa', maxCount: 2 },
        { name: 'bbb', maxCount: 3 },
      ],
      {
        dest: 'uploads',
      },
    ),
  )
  uploadFileFields(
    @UploadedFiles()
    files: { aaa?: Express.Multer.File[]; bbb?: Express.Multer.File[] },
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);
  }

  @Post('ddd')
  @UseInterceptors(
    AnyFilesInterceptor({
      dest: 'uploads',
    }),
  )
  uploadAnyFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);
  }

  @Post('eee')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: storage,
    }),
  )
  uploadAnyFilesAndStorage(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);
  }
}

```

```
// index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <script src="https://unpkg.com/axios@0.24.0/dist/axios.min.js"></script>
  </head>
  <body>
    <div>上传单个文件</div>
    <input id="fileInput" type="file" />
    <div>上传多个文件</div>
    <input id="fileInput2" type="file" multiple />
    <div>文件里有多个字段</div>
    <input id="fileInput3" type="file" multiple />
    <div>不清楚有哪些字段</div>
    <input id="fileInput4" type="file" multiple />
    <div>指定上传文件路径</div>
    <input id="fileInput5" type="file" multiple />

    <script>
      const fileInput = document.querySelector('#fileInput');
      const fileInput2 = document.querySelector('#fileInput2');
      const fileInput3 = document.querySelector('#fileInput3');
      const fileInput4 = document.querySelector('#fileInput4');
      const fileInput5 = document.querySelector('#fileInput5');

      async function formData() {
        const data = new FormData();
        data.set('name', '光');
        data.set('age', 20);
        data.set('aaa', fileInput.files[0]);

        const res = await axios.post('http://localhost:3000/aaa', data);
        console.log(res);
      }

      fileInput.onchange = formData;

      async function formData2() {
        const data = new FormData();
        data.set('name', '光');
        data.set('age', 20);
        [...fileInput2.files].forEach((item) => {
          data.append('bbb', item);
        });

        const res = await axios.post('http://localhost:3000/bbb', data);
        console.log(res);
      }

      fileInput2.onchange = formData2;

      async function formData3() {
        const data = new FormData();
        data.set('name', '光');
        data.set('age', 20);
        data.append('aaa', fileInput3.files[0]);
        data.append('aaa', fileInput3.files[1]);
        data.append('bbb', fileInput3.files[2]);
        data.append('bbb', fileInput3.files[3]);

        const res = await axios.post('http://localhost:3000/ccc', data);
        console.log(res);
      }
      fileInput3.onchange = formData3;

      async function formData4() {
        const data = new FormData();
        data.set('name', '光');
        data.set('age', 20);
        data.set('aaa', fileInput4.files[0]);
        data.set('bbb', fileInput4.files[1]);
        data.set('ccc', fileInput4.files[2]);
        data.set('ddd', fileInput4.files[3]);

        const res = await axios.post('http://localhost:3000/ddd', data);
        console.log(res);
      }
      fileInput4.onchange = formData4;

      async function formData5() {
        const data = new FormData();
        data.set('name', '光');
        data.set('age', 20);
        data.set('aaa', fileInput5.files[0]);
        data.set('bbb', fileInput5.files[1]);
        data.set('ccc', fileInput5.files[2]);
        data.set('ddd', fileInput5.files[3]);

        const res = await axios.post('http://localhost:3000/eee', data);
        console.log(res);
      }
      fileInput5.onchange = formData5;
    </script>
  </body>
</html>
```

## 讲解

Nest 的文件上传也是基于 multer 实现的，它对 multer api 封装了一层，提供了 FileInterceptor、FilesInterceptor、FileFieldsInterceptor、AnyFilesInterceptor 的拦截器，分别用到了 multer 包的 single、array、fields、any 方法。

它们把文件解析出来，放到 request 的某个属性上，然后再用 @UploadedFile、@UploadedFiles 的装饰器取出来传入 handler。
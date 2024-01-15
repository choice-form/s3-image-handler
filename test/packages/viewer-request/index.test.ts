import { handler } from '@/packages/viewer-request/index';

function createCfViewerRequestEvent(
    request: Partial<CfRequest>,
): CfViewerRequestEvent {
    return {
        Records: [
            {
                cf: {
                    config: {
                        distributionDomainName: 'd282bf1w8afqkt.cloudfront.net',
                        distributionId: 'E24B6QLRKBVOZJ',
                        eventType: 'viewer-request',
                        requestId:
                            'Ck6chpX-s3ljKREcQwrF2ARzSARDTEiVFZKFZUrC-32So4JR8fAg5g==',
                    },
                    request: {
                        clientIp: '2a12:a301:1::32b',
                        headers: {
                            accept: [
                                {
                                    key: 'accept',
                                    value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                                },
                            ],
                        },
                        method: 'GET',
                        querystring: '',
                        uri: '/test.jpg',
                        ...request,
                    },
                },
            },
        ],
    };
}

describe('viewer-request handler', () => {
    /**
     * ================= opString in uri =================
     */
    test('browser support webp', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg__op__format,f_auto',
            headers: {
                accept: [
                    {
                        key: 'accept',
                        value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    },
                ],
            },
        });
        const result = await handler(event);
        expect(result.uri).toEqual(
            '/path/to/file/image.jpg__op__format,f_webp',
        );
    });

    test('browser not support webp', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg__op__format,f_auto',
            headers: {
                accept: [
                    {
                        key: 'accept',
                        value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    },
                ],
            },
        });
        const result = await handler(event);
        expect(result.uri).toEqual('/path/to/file/image.jpg');
    });

    test.skip('sort uri image op string', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg__op__format,f_auto__op__resize,m_lfit,h_220,w_220__op__quality,q_90',
        });
        const result = await handler(event);
        expect(result.uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_200,h_200__op__quality,q_80__op__format,f_webp',
        );
    });

    /**
     * ================= opString in querystring =================
     */
    test('browser support webp', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            querystring: 'x-bce-process=image/format,f_auto',
            uri: '/path/to/file/image.jpg',
        });
        const result = await handler(event);
        expect(result.uri).toEqual(
            '/path/to/file/image.jpg__op__format,f_webp',
        );
    });

    test('browser not support webp', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            querystring: 'x-bce-process=image/format,f_auto',
            uri: '/path/to/file/image.jpg',
            headers: {
                accept: [
                    {
                        key: 'accept',
                        value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    },
                ],
            },
        });
        const result = await handler(event);
        expect(result.uri).toEqual('/path/to/file/image.jpg');
    });

    test.skip('sort uri image op string', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            querystring:
                'x-bce-process=image/format,f_auto/resize,m_lfit,h_220,w_220/quality,q_90',
            uri: '/path/to/file/image.jpg',
        });
        const result = await handler(event);
        expect(result.uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_200,h_200__op__quality,q_80__op__format,f_webp',
        );
    });

    /**
     * ================= opString both in uri and querystring =================
     */
    test.skip('op string both in uri and querystring', async () => {
        const event: CfViewerRequestEvent = createCfViewerRequestEvent({
            querystring: 'x-bce-process=image/format,f_auto',
            uri: '/path/to/file/image.jpg__op__resize,m_lfit,h_220,w_220',
        });
        const result = await handler(event);
        expect(result.uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_200,h_200',
        );
    });

    /**
     * ================= choiceform test cases =================
     */
    test('convert alias to op string in uri', async () => {
        let event: CfViewerRequestEvent = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!high',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__quality,q_80__op__format,f_webp',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!avatar',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_mfit,w_64,h_64__op__quality,q_80',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!thumbnail',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_128,h_128,limit_1__op__quality,q_40',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!m480',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_480,h_480__op__quality,q_80',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!m720',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_720,h_720__op__quality,q_80',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!m1080',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_1080,h_1080__op__quality,q_80',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!m1920',
        });
        expect((await handler(event)).uri).toEqual(
            '/path/to/file/image.jpg__op__resize,m_lfit,w_480,h_480__op__quality,q_80',
        );

        event = createCfViewerRequestEvent({
            uri: '/path/to/file/image.jpg!origin',
        });
        expect((await handler(event)).uri).toEqual('/path/to/file/image.jpg');
    });
});

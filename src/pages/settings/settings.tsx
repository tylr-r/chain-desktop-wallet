import React, { useEffect, useState, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import './settings.less';
import 'antd/dist/antd.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button, Form, Input, Layout, Tabs, Alert, Checkbox, InputNumber } from 'antd';
import { useRecoilState } from 'recoil';
import { sessionState } from '../../recoil/atom';
import { walletService } from '../../service/WalletService';
import { SettingsDataUpdate } from '../../models/Wallet';
import { Session } from '../../models/Session';
import ModalPopup from '../../components/ModalPopup/ModalPopup';

import { FIXED_DEFAULT_FEE, FIXED_DEFAULT_GAS_LIMIT } from '../../config/StaticConfig';

const { Header, Content, Footer } = Layout;
const { TabPane } = Tabs;
const layout = {
  // labelCol: { span: 8 },
  // wrapperCol: { span: 16 },
};
const tailLayout = {
  // wrapperCol: { offset: 8, span: 16 },
};

const FormGeneral = () => {
  return (
    <>
      <Form.Item
        name="nodeUrl"
        label="Node URL"
        hasFeedback
        rules={[
          {
            required: true,
          },
          {
            pattern: /(https?:\/\/)?[\w\-~]+(\.[\w\-~]+)+(\/[\w\-~]*)*(#[\w-]*)?(\?.*)?/,
            message: 'Please enter a valid node url',
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="indexingUrl"
        label="Chain Indexing URL"
        hasFeedback
        rules={[
          { required: true, message: 'Chain Indexing URL is required' },
          {
            pattern: /(https?:\/\/)?[\w\-~]+(\.[\w\-~]+)+(\/[\w\-~]*)*(#[\w-]*)?(\?.*)?/,
            message: 'Please enter a valid indexing url',
          },
        ]}
      >
        <Input placeholder="Chain Indexing URL" />
      </Form.Item>
      <Form.Item
        name="chainId"
        label="Chain ID"
        hasFeedback
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <div className="row">
        <Form.Item
          name="networkFee"
          label="Network Fee"
          hasFeedback
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber precision={0} min={1} />
        </Form.Item>
        <Form.Item
          name="gasLimit"
          label="Gas Limit"
          hasFeedback
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber precision={0} min={1} />
        </Form.Item>
      </div>
    </>
  );
};

const FormSettings = () => {
  const [form] = Form.useForm();
  const [confirmClearForm] = Form.useForm();
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [isConfirmClearVisible, setIsConfirmClearVisible] = useState(false);
  const [session, setSession] = useRecoilState(sessionState);
  const defaultSettings = session.wallet.config;
  const didMountRef = useRef(false);
  const history = useHistory();
  let networkFee = parseInt(FIXED_DEFAULT_FEE, 10);
  let gasLimit = parseInt(FIXED_DEFAULT_GAS_LIMIT, 10);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;

      if (defaultSettings.fee !== undefined && defaultSettings.fee.networkFee !== undefined) {
        networkFee = parseInt(defaultSettings.fee.networkFee, 10);
      }
      if (defaultSettings.fee !== undefined && defaultSettings.fee.gasLimit !== undefined) {
        gasLimit = parseInt(defaultSettings.fee.gasLimit, 10);
      }

      form.setFieldsValue({
        nodeUrl: defaultSettings.nodeUrl,
        chainId: defaultSettings.network.chainId,
        indexingUrl: defaultSettings.indexingUrl,
        networkFee,
        gasLimit,
      });
    }
  }, [form, defaultSettings]);

  const onFinish = async values => {
    if (
      defaultSettings.nodeUrl === values.nodeUrl &&
      defaultSettings.indexingUrl === values.indexingUrl &&
      defaultSettings.network.chainId === values.chainId &&
      defaultSettings.fee.gasLimit === values.gasLimit &&
      defaultSettings.fee.networkFee === values.networkFee
    ) {
      // No value was updated, we stop here
      return;
    }
    setIsButtonLoading(true);
    const settingsDataUpdate: SettingsDataUpdate = {
      walletId: session.wallet.identifier,
      chainId: values.chainId,
      nodeUrl: values.nodeUrl,
      indexingUrl: values.indexingUrl,
      networkFee: String(values.networkFee),
      gasLimit: String(values.gasLimit),
    };

    await walletService.updateWalletNodeConfig(settingsDataUpdate);
    const updatedWallet = await walletService.findWalletByIdentifier(session.wallet.identifier);
    const newSession = new Session(updatedWallet);
    await walletService.setCurrentSession(newSession);
    setSession(newSession);
    setIsButtonLoading(false);
  };

  const onRestoreDefaults = () => {
    form.setFieldsValue({
      nodeUrl: defaultSettings.nodeUrl,
      chainId: defaultSettings.network.chainId,
      indexingUrl: defaultSettings.indexingUrl,
    });
  };

  const handleCancelConfirmationModal = () => {
    setIsConfirmationModalVisible(false);
    setIsConfirmClearVisible(false);
  };

  const onConfirmClear = () => {
    setIsConfirmationModalVisible(false);
    setIsButtonLoading(true);
    indexedDB.deleteDatabase('NeDB');
    setTimeout(() => {
      history.replace('/');
      history.go(0);
    }, 2000);
  };

  return (
    <Form
      {...layout}
      layout="vertical"
      form={form}
      name="control-hooks"
      requiredMark="optional"
      onFinish={onFinish}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab="Node Configuration" key="1">
          <div className="site-layout-background settings-content">
            <div className="container">
              <FormGeneral />
              <Form.Item {...tailLayout} className="button">
                <Button type="primary" htmlType="submit" loading={isButtonLoading}>
                  Save
                </Button>
                <Button type="link" htmlType="button" onClick={onRestoreDefaults}>
                  Restore Default
                </Button>
              </Form.Item>
            </div>
          </div>
        </TabPane>
        <TabPane tab="Clear Storage" key="2">
          <div className="site-layout-background settings-content">
            <div className="container">
              <div className="description">
                Once you clear the storage, you will lose access to all you wallets. The only way to
                regain wallet access is by restoring wallet mnemonic phrase. <br />
              </div>
              <Button
                type="primary"
                loading={isButtonLoading}
                onClick={() => setIsConfirmationModalVisible(true)}
                danger
              >
                Clear Storage
              </Button>
            </div>
          </div>
          <ModalPopup
            isModalVisible={isConfirmationModalVisible}
            handleCancel={handleCancelConfirmationModal}
            handleOk={onConfirmClear}
            confirmationLoading={isButtonLoading}
            footer={[
              <Button
                key="submit"
                type="primary"
                loading={isButtonLoading}
                onClick={() => setIsConfirmClearVisible(true)}
                hidden={isConfirmClearVisible}
                disabled={isButtonDisabled}
                danger
              >
                Confirm
              </Button>,
              <Button
                type="primary"
                htmlType="submit"
                loading={isButtonLoading}
                hidden={!isConfirmClearVisible}
                onClick={confirmClearForm.submit}
                danger
              >
                Clear Storage
              </Button>,
              <Button
                key="back"
                type="link"
                onClick={handleCancelConfirmationModal}
                // hidden={isConfirmClearVisible}
              >
                Cancel
              </Button>,
            ]}
            okText="Confirm"
          >
            <>
              <div className="title">Confirm Clear Storage</div>

              {!isConfirmClearVisible ? (
                <>
                  <div className="description">
                    You may wish to verify your recovery mnemonic phrase before deletion to ensure
                    that you can restore this wallet in the future.
                  </div>
                  <div className="item">
                    <Alert
                      type="warning"
                      message="Are you sure you want to clear the storage? If you have not backed up your wallet mnemonic phrase, you will result in losing your funds forever."
                      showIcon
                    />
                  </div>
                  <div className="item">
                    <Checkbox
                      checked={!isButtonDisabled}
                      onChange={() => setIsButtonDisabled(!isButtonDisabled)}
                    >
                      I understand that the only way to regain access is by restoring wallet
                      mnemonic phrase.
                    </Checkbox>
                  </div>
                </>
              ) : (
                <div className="item">
                  <Form
                    {...layout}
                    layout="vertical"
                    form={confirmClearForm}
                    name="control-hooks"
                    requiredMark="optional"
                    onFinish={onConfirmClear}
                  >
                    <Form.Item
                      name="clear"
                      label="Please enter CLEAR"
                      hasFeedback
                      rules={[
                        {
                          required: true,
                        },
                        {
                          pattern: /CLEAR/,
                          message: 'Please enter CLEAR',
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                  </Form>
                </div>
              )}
            </>
          </ModalPopup>
        </TabPane>
      </Tabs>
    </Form>
  );
};

function SettingsPage() {
  return (
    <Layout className="site-layout">
      <Header className="site-layout-background">Settings</Header>
      <div className="header-description">
        An invalid configuration might result in wallet malfunction.
      </div>
      <Content>
        <FormSettings />
      </Content>
      <Footer />
    </Layout>
  );
}

export default SettingsPage;

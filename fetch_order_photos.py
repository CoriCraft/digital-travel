import requests
import os
import json

# 配置信息
BASE_API = "https://api-magicscreen.xcastle.net/-/txry"
BASE_OSS = "https://s0.xcastle.net/"
USERNAME = "bjlgdx"
PASSWORD = "123456"
TARGET_BUSINESS_ORDER_ID = "bf251bf7bac24d67"

def fetch_photos():
    session = requests.Session()
    
    # 1. 登录获取 Token
    print(f"[*] 正在尝试登录账号: {USERNAME}...")
    login_url = f"{BASE_API}/passport/login"
    login_data = {"username": USERNAME, "password": PASSWORD}
    try:
        resp = session.post(login_url, json=login_data)
        resp_json = resp.json()
    except Exception as e:
        print(f"[!] 登录请求异常: {e}")
        return
    
    if resp.status_code != 200 or resp_json.get("code") != "100":
        print(f"[!] 登录失败: {resp_json.get('message', '未知错误')}")
        return
    
    token = resp_json["data"]["token"]
    print(f"[+] 登录成功，获取到 Token: {token[:10]}...")
    
    # 设置通用 Header
    session.headers.update({"x-auth-token": token})

    # 2. 根据业务订单号反查内部 ID
    print(f"[*] 正在查询订单 {TARGET_BUSINESS_ORDER_ID} 的内部 ID...")
    search_url = f"{BASE_API}/v2/order/pageList"
    search_payload = {
        "pageNum": 1,
        "pageSize": 10,
        "filters": {"businessOrderId": TARGET_BUSINESS_ORDER_ID}
    }
    resp = session.post(search_url, json=search_payload)
    order_list = resp.json().get("data", {}).get("list", [])
    
    if not order_list:
        print("[!] 未找到该订单信息")
        return
    
    internal_id = order_list[0]["id"]
    print(f"[+] 找到内部 ID: {internal_id}")

    # 3. 获取订单详情
    print(f"[*] 正在获取订单 {internal_id} 的详细照片列表...")
    detail_url = f"{BASE_API}/v2/order?id={internal_id}"
    resp = session.get(detail_url)
    order_data = resp.json().get("data", {})
    
    # 提取所有图片 URL
    photo_urls = []
    # 业务数据中的照片
    for item in order_data.get("businessData", []):
        if item.get("picUrl"):
            photo_urls.append(item["picUrl"])
    # 原始照片
    if order_data.get("originalityPicUrl"):
        photo_urls.append(order_data["originalityPicUrl"])
    
    # 去重
    photo_urls = list(set(photo_urls))
    print(f"[+] 共发现 {len(photo_urls)} 张唯一照片地址，准备下载...")

    # 4. 下载照片
    save_dir = f"order_{TARGET_BUSINESS_ORDER_ID}"
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    for i, path in enumerate(photo_urls):
        # 排除无效路径
        if not path or path == "screen/app-privacy.svg":
            continue
            
        full_url = f"{BASE_OSS}{path}"
        ext = os.path.splitext(path)[1] or ".jpg"
        save_path = os.path.join(save_dir, f"photo_{i+1}{ext}")
        
        print(f"[*] 正在下载第 {i+1} 张: {full_url}")
        try:
            img_resp = requests.get(full_url, timeout=15)
            if img_resp.status_code == 200:
                with open(save_path, "wb") as f:
                    f.write(img_resp.content)
                print(f"[OK] 已保存至: {save_path}")
            else:
                print(f"[!] 下载失败，状态码: {img_resp.status_code}")
        except Exception as e:
            print(f"[!] 下载过程中出错: {e}")

    print(f"\n[√] 任务完成！照片保存在目录: {save_dir}")

if __name__ == "__main__":
    fetch_photos()

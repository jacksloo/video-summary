import requests

def test_register():
    response = requests.post(
        "http://localhost:8000/api/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123",
            "phone": "13800138000"
        }
    )
    print("注册响应:", response.json())

def test_login():
    response = requests.post(
        "http://localhost:8000/api/login",
        data={
            "username": "testuser",
            "password": "testpass123",
            "grant_type": "password"
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )
    if response.status_code == 200:
        print("登录成功:", response.json())
    else:
        print(f"登录失败: {response.status_code}", response.text)

if __name__ == "__main__":
    try:
        test_register()
        test_login()
    except Exception as e:
        print(f"测试出错: {str(e)}") 